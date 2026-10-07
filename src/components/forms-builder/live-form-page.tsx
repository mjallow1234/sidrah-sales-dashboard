'use client';
import { useEffect, useState } from 'react';
import { getLiveForm } from '@/lib/api/formDefinitions';
import { LiveForm } from './live-form';
import type { FormDefinition } from '@/lib/types/forms';
export function LiveFormPageClient({ formKey }: { formKey: string }) { const [form,setForm]=useState<FormDefinition|null>(null); const [error,setError]=useState(''); useEffect(()=>{getLiveForm(formKey).then(setForm).catch(e=>setError(e.message));},[formKey]); if(error)return <p>{error}</p>; if(!form)return <p>Loading…</p>; return <LiveForm definition={form}/>; }
