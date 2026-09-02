import { randomUUID } from 'crypto';
import { getPool } from '@/lib/db';
import type { DeliveryItem, DeliveryRecord, DeliveryStatus } from '@/lib/types';
import { DeliveryRepository, type CreateDeliveryPayload, type DeliverySearchFilters } from '@/repositories/DeliveryRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { AppUserRepository } from '@/repositories/AppUserRepository';
import { NotFoundError } from '@/repositories/errors';

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

async function validateItems(value: unknown, productRepository: ProductRepository): Promise<DeliveryItem[]> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'At least one delivery item is required.');
  }

  const items: DeliveryItem[] = [];
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
  }

  return items;
}

export interface CreateDeliveryRequest {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: DeliveryItem[];
  notes?: string;
}

export async function createDelivery(payload: CreateDeliveryRequest, createdBy: string): Promise<DeliveryRecord> {
  const repository = new DeliveryRepository(getPool());
  const productRepository = new ProductRepository(getPool());
  const customerName = validateRequiredString(payload.customer_name, 'Customer name');
  const customerPhone = validateRequiredString(payload.customer_phone, 'Customer phone');
  const deliveryAddress = validateRequiredString(payload.delivery_address, 'Delivery address');
  const items = await validateItems(payload.items, productRepository);
  const notes = typeof payload.notes === 'string' && payload.notes.trim() !== '' ? payload.notes.trim() : undefined;

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  return repository.create({
    delivery_id: buildId('DLV'),
    customer_name: customerName,
    customer_phone: customerPhone,
    delivery_address: deliveryAddress,
    items,
    notes,
    status: 'pending',
    created_by: createdBy,
    claimed_by: null,
    claimed_at: null,
    delivered_at: null,
    date_created: now,
    last_updated: now,
    updated_by: createdBy,
  });
}

export async function getDeliveries(status?: DeliveryStatus, deliveryUserId?: string): Promise<DeliveryRecord[]> {
  const repository = new DeliveryRepository(getPool());
  const filters: DeliverySearchFilters = {};
  if (status) {
    filters.status = status;
  }
  if (deliveryUserId) {
    filters.deliveryUserId = deliveryUserId;
  }
  return repository.findAll(filters);
}

export async function getDeliveryById(deliveryId: string): Promise<DeliveryRecord> {
  const repository = new DeliveryRepository(getPool());
  return repository.findById(deliveryId);
}

export async function claimDelivery(deliveryId: string, deliveryUserId: string): Promise<DeliveryRecord> {
  const repository = new DeliveryRepository(getPool());
  try {
    return await repository.claim(deliveryId, deliveryUserId, deliveryUserId);
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

export async function markDeliveryDelivered(deliveryId: string, deliveryUserId: string): Promise<DeliveryRecord> {
  const repository = new DeliveryRepository(getPool());
  try {
    return await repository.deliver(deliveryId, deliveryUserId, deliveryUserId);
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

export async function completeDeliveryAsAdmin(deliveryId: string, actingUserId: string): Promise<DeliveryRecord> {
  const repository = new DeliveryRepository(getPool());
  try {
    return await repository.completeAsAdmin(deliveryId, actingUserId);
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

export async function reassignDelivery(deliveryId: string, targetUserId: string, actingUserId: string): Promise<DeliveryRecord> {
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

  const repository = new DeliveryRepository(getPool());
  try {
    return await repository.reassign(deliveryId, trimmedTargetId, actingUserId);
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

export async function cancelDelivery(deliveryId: string, actingUserId: string): Promise<DeliveryRecord> {
  const repository = new DeliveryRepository(getPool());
  try {
    return await repository.cancel(deliveryId, actingUserId);
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
