import { ExistingFormBuilder } from '@/components/forms-builder/form-builder';
export default async function FormEditPage({ params }: { params: Promise<{ formId: string }> }){ return <main className="mx-auto max-w-4xl"><ExistingFormBuilder formId={(await params).formId}/></main>; }
