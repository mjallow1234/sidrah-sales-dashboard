'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFormDefinition, getFormDefinition, getPublishedLeadForm, listFormDefinitions, publishFormDefinition, saveFormDraft } from '@/lib/api/formDefinitions';
export function useFormDefinitionsQuery() { return useQuery({ queryKey: ['form-definitions'], queryFn: listFormDefinitions }); }
export function useFormDefinitionQuery(formId: string) { return useQuery({ queryKey: ['form-definition', formId], queryFn: () => getFormDefinition(formId), enabled: Boolean(formId) }); }
export function usePublishedLeadFormQuery() { return useQuery({ queryKey: ['published-lead-form'], queryFn: getPublishedLeadForm, staleTime: 60 * 1000 }); }
export function useCreateFormDefinitionMutation() { const client = useQueryClient(); return useMutation({ mutationFn: createFormDefinition, onSuccess: () => client.invalidateQueries({ queryKey: ['form-definitions'] }) }); }
export function useSaveFormDraftMutation(formId: string) { const client = useQueryClient(); return useMutation({ mutationFn: (payload: unknown) => saveFormDraft(formId, payload), onSuccess: () => client.invalidateQueries({ queryKey: ['form-definition', formId] }) }); }
export function usePublishFormMutation(formId: string) { const client = useQueryClient(); return useMutation({ mutationFn: () => publishFormDefinition(formId), onSuccess: () => client.invalidateQueries({ queryKey: ['form-definition', formId] }) }); }
