import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { DeliveryItem, DeliveryPreparationSummary, DeliveryPriority, DeliveryRecord, DeliveryStatus } from '@/lib/types';
import type { AppUserRole } from '@/lib/authorization';
import { DeliveryRepository, type CreateDeliveryPayload, type DeliverySearchFilters } from '@/repositories/DeliveryRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { AppUserRepository } from '@/repositories/AppUserRepository';
import { NotFoundError } from '@/repositories/errors';
import { AgentAccountabilityRepository, type AccountabilityLine } from '@/repositories/AgentAccountabilityRepository';
import { VendorAccountabilityAssignmentRepository } from '@/repositories/VendorAccountabilityAssignmentRepository';
import { formatLocalDateInput, isValidDateOnly } from '@/lib/dateOnly';

class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${fieldName} is required.`);
  }
  return value.trim();
}

async function validateItems(value: unknown, productRepository: ProductRepository): Promise<{ items: DeliveryItem[]; valuationLines: AccountabilityLine[] }> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'At least one delivery item is required.');
  }

  const items: DeliveryItem[] = [];
  const valuationLines: AccountabilityLine[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (typeof item !== 'object' || item === null) {
      throw new HttpError(400, `Item ${index + 1} is invalid.`);
    }

    const productId = typeof (item as any).product_id === 'string' ? (item as any).product_id.trim() : '';
    const quantity = Number((item as any).quantity);

    if (!productId) {
      throw new HttpError(400, `Item ${index + 1}: product is required.`);
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new HttpError(400, `Item ${index + 1}: quantity must be greater than zero.`);
    }

    let product;
    try {
      product = await productRepository.findById(productId);
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        throw new HttpError(400, `Item ${index + 1}: selected product does not exist.`);
      }
      throw error;
    }

    items.push({
      product_id: product.product_id,
      product_name: product.product_name,
      sku: product.sku,
      quantity,
    });
    const unitValue = Number(product.default_unit_price);
    if (!Number.isFinite(unitValue) || unitValue < 0) throw new HttpError(400, `Item ${index + 1}: product has an invalid unit value.`);
    valuationLines.push({ product_id: product.product_id, quantity, unit_value: unitValue, amount: quantity * unitValue });
  }

  return { items, valuationLines };
}

export interface CreateDeliveryRequest {
  vendor_id?: unknown;
  accountability_agent_user_id?: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: DeliveryItem[];
  notes?: string;
  priority?: unknown;
  delivery_date?: unknown;
  cooking_location?: unknown;
}

const deliveryPriorities: readonly DeliveryPriority[] = ['low', 'normal', 'high', 'urgent'];

function validatePriority(value: unknown): DeliveryPriority {
  if (value === undefined || value === null || value === '') return 'normal';
  if (typeof value !== 'string' || !deliveryPriorities.includes(value as DeliveryPriority)) {
    throw new HttpError(400, 'Priority must be Low, Normal, High, or Urgent.');
  }
  return value as DeliveryPriority;
}

function validateDeliveryDate(value: unknown, rejectPast = false): string {
  if (typeof value !== 'string' || !isValidDateOnly(value)) {
    throw new HttpError(400, 'Delivery date is required and must be a valid date.');
  }
  if (rejectPast && value < formatLocalDateInput()) {
    throw new HttpError(400, 'Delivery date cannot be in the past. Select today or a future date.');
  }
  return value;
}

function validateCookingLocation(value: unknown): 'Home' | 'Workplace' | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value !== 'Home' && value !== 'Workplace') throw new HttpError(400, 'Cooking location must be Home or Workplace.');
  return value;
}

export async function createDelivery(payload: CreateDeliveryRequest, createdBy: string): Promise<DeliveryRecord> {
  const productRepository = new ProductRepository(getPool());
  const customerName = validateRequiredString(payload.customer_name, 'Customer name');
  const customerPhone = validateRequiredString(payload.customer_phone, 'Customer phone');
  const deliveryAddress = validateRequiredString(payload.delivery_address, 'Delivery address');
  const { items, valuationLines } = await validateItems(payload.items, productRepository);
  const vendorId = validateRequiredString(payload.vendor_id, 'Vendor');
  const notes = typeof payload.notes === 'string' && payload.notes.trim() !== '' ? payload.notes.trim() : undefined;
  const priority = validatePriority(payload.priority);
  const deliveryDate = validateDeliveryDate(payload.delivery_date, true);
  const cookingLocation = validateCookingLocation(payload.cooking_location);

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const deliveryId = buildId('DLV');
  return transaction(async (connection) => {
    const repository = new DeliveryRepository(connection);
    const [vendorRows] = await connection.execute<any[]>('SELECT vendor_id FROM vendors WHERE vendor_id = ? LIMIT 1', [vendorId]);
    if (!vendorRows.length) throw new HttpError(400, 'Selected vendor does not exist.');
    const result = await repository.create({
    delivery_id: deliveryId,
    vendor_id: vendorId,
    customer_name: customerName,
    customer_phone: customerPhone,
    delivery_address: deliveryAddress,
    items,
    notes,
    status: 'pending',
    priority,
    delivery_date: deliveryDate,
    cooking_location: cookingLocation,
    created_by: createdBy,
    claimed_by: null,
    claimed_at: null,
    delivered_at: null,
    date_created: now,
    last_updated: now,
    updated_by: createdBy,
    });
    await repository.createActivity({ activity_id: buildId('DA'), delivery_id: deliveryId, activity_type: 'created', new_status: 'pending', actor_user_id: createdBy });
    const assignment = await new VendorAccountabilityAssignmentRepository(connection).findActive(vendorId);
    const accountabilityAgent = assignment?.agent_user_id ?? payload.accountability_agent_user_id;
    if (accountabilityAgent) {
      await new AgentAccountabilityRepository(connection).createPendingCase({
        case_id: buildId('AAC'), delivery_id: deliveryId, vendor_id: vendorId,
        assignment_id: assignment?.assignment_id, accountable_agent_user_id: accountabilityAgent, created_by: createdBy,
        lines: valuationLines, occurred_at: now,
      });
    }
    return result;
  });
}


export async function updateDeliveryDate(deliveryId: string, value: unknown, actingUserId: string): Promise<DeliveryRecord> {
  const deliveryDate = validateDeliveryDate(value);
  return transaction(async (connection) => new DeliveryRepository(connection).updateDeliveryDate(deliveryId, deliveryDate, actingUserId));
}

export async function updateDeliveryDetails(deliveryId: string, deliveryDateValue: unknown, cookingLocationValue: unknown, actingUserId: string): Promise<DeliveryRecord> {
  const deliveryDate = validateDeliveryDate(deliveryDateValue);
  const cookingLocation = validateCookingLocation(cookingLocationValue) ?? null;
  return transaction(async (connection) => new DeliveryRepository(connection).updateDeliveryDetails(deliveryId, deliveryDate, cookingLocation, actingUserId));
}

export async function getDeliveries(status?: DeliveryStatus | DeliveryStatus[], deliveryUserId?: string, productId?: string, unassigned = false, vendor?: string, location?: string, deliveredDate?: string): Promise<DeliveryRecord[]> {
  const repository = new DeliveryRepository(getPool());
  const filters: DeliverySearchFilters = {};
  if (status) {
    filters.status = status;
  }
  if (deliveryUserId) {
    filters.deliveryUserId = deliveryUserId;
  }
  if (productId) filters.productId = productId;
  if (unassigned) filters.unassigned = true;
  if (vendor) filters.vendor = vendor;
  if (location) filters.location = location;
  if (deliveredDate) filters.deliveredDate = deliveredDate;
  return repository.findAll(filters);
}

function normalizeComment(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, 'Comment must be text.');
  const trimmed = value.trim();
  if (trimmed.length > 2000) throw new HttpError(400, 'Comment must be 2,000 characters or fewer.');
  return trimmed || undefined;
}

function requireComment(value: unknown): string {
  const comment = normalizeComment(value);
  if (!comment) throw new HttpError(400, 'Comment is required.');
  return comment;
}

function validateEmptyGallons(value: unknown): number {
  if (value === undefined) return 0;
  const quantity = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isInteger(quantity) || quantity < 0) throw new HttpError(400, 'Empty gallons received must be a whole number greater than or equal to zero.');
  return quantity;
}

export async function getDeliveryPreparationSummary(): Promise<DeliveryPreparationSummary> {
  const repository = new DeliveryRepository(getPool());
  return repository.getPreparationSummary();
}

export async function getDeliveryById(deliveryId: string): Promise<DeliveryRecord> {
  const repository = new DeliveryRepository(getPool());
  return repository.findById(deliveryId);
}

export async function addDeliveryItems(deliveryId: string, value: unknown, actingUserId: string): Promise<DeliveryRecord> {
  const productRepository = new ProductRepository(getPool());
  const { items, valuationLines } = await validateItems(value, productRepository);
  try {
    return await transaction(async (connection) => {
      const result = await new DeliveryRepository(connection).addItems(deliveryId, items, actingUserId);
      await new AgentAccountabilityRepository(connection).appendPendingLines(deliveryId, valuationLines, actingUserId, new Date().toISOString().slice(0, 19).replace('T', ' '));
      return result;
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Products can only')) {
      throw new HttpError(409, error.message);
    }
    if (error instanceof NotFoundError) {
      throw new HttpError(404, error.message);
    }
    throw error;
  }
}

export async function claimDelivery(deliveryId: string, deliveryUserId: string, comment?: unknown): Promise<DeliveryRecord> {
  const normalizedComment = normalizeComment(comment);
  try {
    return await transaction(async (connection) => new DeliveryRepository(connection).claim(deliveryId, deliveryUserId, deliveryUserId, buildId('DA'), normalizedComment));
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not pending')) {
      throw new HttpError(409, error.message);
    }
    if (error instanceof NotFoundError) {
      throw new HttpError(404, error.message);
    }
    throw error;
  }
}

export async function markDeliveryDelivered(deliveryId: string, deliveryUserId: string, comment?: unknown, emptyGallonsReceived?: unknown): Promise<DeliveryRecord> {
  const normalizedComment = normalizeComment(comment);
  const quantity = validateEmptyGallons(emptyGallonsReceived);
  try {
    return await transaction(async (connection) => {
      const result = await new DeliveryRepository(connection).deliver(deliveryId, deliveryUserId, deliveryUserId, buildId('DA'), normalizedComment, quantity, buildId('EGR'));
      await new AgentAccountabilityRepository(connection).activateDelivery(deliveryId, deliveryUserId, new Date().toISOString().slice(0, 19).replace('T', ' '));
      return result;
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('cannot be marked')) {
      throw new HttpError(409, error.message);
    }
    if (error instanceof NotFoundError) {
      throw new HttpError(404, error.message);
    }
    throw error;
  }
}

export async function completeDeliveryAsAdmin(deliveryId: string, actingUserId: string, comment?: unknown, emptyGallonsReceived?: unknown): Promise<DeliveryRecord> {
  const normalizedComment = normalizeComment(comment);
  const quantity = validateEmptyGallons(emptyGallonsReceived);
  try {
    return await transaction(async (connection) => {
      const result = await new DeliveryRepository(connection).completeAsAdmin(deliveryId, actingUserId, buildId('DA'), normalizedComment, quantity, buildId('EGR'));
      await new AgentAccountabilityRepository(connection).activateDelivery(deliveryId, actingUserId, new Date().toISOString().slice(0, 19).replace('T', ' '));
      return result;
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('cannot be marked')) {
      throw new HttpError(409, error.message);
    }
    if (error instanceof NotFoundError) {
      throw new HttpError(404, error.message);
    }
    throw error;
  }
}

export async function reassignDelivery(deliveryId: string, targetUserId: string, actingUserId: string, comment?: unknown): Promise<DeliveryRecord> {
  const trimmedTargetId = validateRequiredString(targetUserId, 'Delivery user');
  const userRepository = new AppUserRepository(getPool());

  let targetUser;
  try {
    targetUser = await userRepository.findById(trimmedTargetId);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      throw new HttpError(400, 'Selected delivery user does not exist.');
    }
    throw error;
  }

  if (targetUser.role !== 'delivery' || targetUser.status !== 'active') {
    throw new HttpError(400, 'Delivery can only be assigned to an active delivery user.');
  }

  const normalizedComment = normalizeComment(comment);
  try {
    return await transaction(async (connection) => new DeliveryRepository(connection).reassign(deliveryId, trimmedTargetId, actingUserId, buildId('DA'), normalizedComment));
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('cannot be reassigned')) {
      throw new HttpError(409, error.message);
    }
    if (error instanceof NotFoundError) {
      throw new HttpError(404, error.message);
    }
    throw error;
  }
}

export async function cancelDelivery(deliveryId: string, actingUserId: string, comment?: unknown): Promise<DeliveryRecord> {
  const normalizedComment = normalizeComment(comment);
  try {
    return await transaction(async (connection) => new DeliveryRepository(connection).cancel(deliveryId, actingUserId, buildId('DA'), normalizedComment));
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('cannot be cancelled')) {
      throw new HttpError(409, error.message);
    }
    if (error instanceof NotFoundError) {
      throw new HttpError(404, error.message);
    }
    throw error;
  }
}

export async function getDeliveryAccountability(deliveryId: string) {
  return new AgentAccountabilityRepository(getPool()).findByDelivery(deliveryId);
}

export async function getDeliveryActivity(deliveryId: string) {
  const repository = new DeliveryRepository(getPool());
  await repository.findById(deliveryId);
  return repository.findActivity(deliveryId);
}

export async function addDeliveryComment(deliveryId: string, actorUserId: string, role: AppUserRole, value: unknown) {
  const comment = requireComment(value);
  return transaction(async (connection) => {
    const repository = new DeliveryRepository(connection);
    const delivery = await repository.findById(deliveryId);
    const elevated = role === 'admin' || role === 'super_admin' || role === 'supervisor';
    const deliveryUserAllowed = role === 'agent' || (role === 'delivery' && (delivery.status === 'pending' || delivery.claimed_by === actorUserId));
    if (!elevated && !deliveryUserAllowed) throw new HttpError(403, 'You are not allowed to comment on this delivery.');
    await repository.createStandaloneComment(deliveryId, buildId('DA'), actorUserId, comment);
    return repository.findActivity(deliveryId);
  });
}
