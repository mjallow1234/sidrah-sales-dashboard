import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { canReverseFactoryRecords } from '@/lib/authorization';
import { reverseFactoryContainerMovement } from '@/services/factoryContainerService';
export async function POST(request: NextRequest) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); if (!canReverseFactoryRecords(session.role) || !session.userId) return forbiddenResponse(); try { return Response.json({ status: 'success', data: await reverseFactoryContainerMovement({ ...(await request.json()), actor_user_id: session.userId }) }); } catch (error) { const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) || 500 : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); } }
