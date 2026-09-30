'use client';
import { useRouter } from 'next/navigation';
import { LeadForm } from '@/components/crm/lead-form';
export default function NewCrmLeadPage() { const router = useRouter(); return <main className="mx-auto max-w-3xl"><LeadForm onDone={() => router.push('/crm/leads')} /></main>; }
