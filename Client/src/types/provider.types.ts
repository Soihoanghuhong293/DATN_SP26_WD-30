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

export interface IHotel {
  id?: string;
  _id?: string;
  name: string;
  address?: string;
  provider_id?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface IRoom {
  id?: string;
  _id?: string;
  hotel_id?: string | { _id?: string; name?: string; address?: string };
  room_number: string;
  max_occupancy?: number;
  status?: 'active' | 'inactive';
  provider_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IRestaurant {
  id?: string;
  _id?: string;
  name: string;
  phone?: string;
  capacity: number;
  location?: string;
  provider_id?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export type TicketApplicationMode = 'included_in_tour' | 'optional_addon';

export interface IProviderTicket {
  id?: string;
  _id?: string;
  name: string;
  ticket_type: string;
  price_adult: number;
  price_child: number;
  application_mode: TicketApplicationMode;
  provider_id?: string;
  status?: 'active' | 'inactive';
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
