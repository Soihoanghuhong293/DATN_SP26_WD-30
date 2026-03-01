export type ProviderStatus = 'active' | 'inactive';

export interface IProvider {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  contract_info?: string;
  preferred_pricing?: string;
  status?: ProviderStatus;
  created_at: string;
  update_at: string;
}

export interface CreateProviderPayload {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  contract_info?: string;
  preferred_pricing?: string;
  status?: 'active' | 'inactive';
}

export type UpdateProviderPayload = Partial<CreateProviderPayload>;
