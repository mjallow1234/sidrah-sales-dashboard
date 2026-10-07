import { FormPreview } from '@/components/forms-builder/form-preview';
import { getForm } from '@/services/formDefinitionService';
import { verifySession } from '@/lib/session';
import { cookies } from 'next/headers';
export default async function FormPreviewPage({ params }: { params: Promise<{ formId: string }> }) { const token = (await cookies()).get('sidrah_session')?.value; const session = token ? await verifySession(token) : null; if (!session?.valid || !session.role) return null; const definition = await getForm((await params).formId, session.role); return <main className="mx-auto max-w-4xl"><FormPreview definition={definition}/></main>; }
