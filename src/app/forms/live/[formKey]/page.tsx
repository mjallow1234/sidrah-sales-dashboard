import { LiveFormPageClient } from '@/components/forms-builder/live-form-page';
export default async function LiveFormPage({ params }: { params: Promise<{ formKey: string }> }) { return <main className="mx-auto max-w-3xl"><LiveFormPageClient formKey={(await params).formKey}/></main>; }
