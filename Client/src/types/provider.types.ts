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

export interface IVehicle {
  id?: string;
  _id?: string;
  plate: string;
  capacity: number;
  status?: 'active' | 'inactive';
  provider_id?: string;
  created_at?: string;
  updated_at?: string;
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
