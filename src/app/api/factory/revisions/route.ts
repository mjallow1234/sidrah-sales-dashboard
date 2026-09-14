import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isFactoryRole } from '@/lib/authorization';
import { listFactoryEventRevisions } from '@/services/factoryInventoryService';
import { listFactoryContainerRevisions } from '@/services/factoryContainerService';
export async function GET(request: NextRequest) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); if (!isFactoryRole(session.role)) return forbiddenResponse(); const eventId = request.nextUrl.searchParams.get('event_id'); const movementId = request.nextUrl.searchParams.get('movement_id'); if (!eventId && !movementId) return Response.json({ status: 'error', message: 'event_id or movement_id is required.' }, { status: 400 }); try { const data = eventId ? await listFactoryEventRevisions(eventId) : await listFactoryContainerRevisions(movementId as string); return Response.json({ status: 'success', data }); } catch (error) { return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 }); } }
