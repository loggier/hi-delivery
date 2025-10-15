import { VehicleBrand } from "@/types";

export const vehicleBrands: readonly VehicleBrand[] = ['Italika', 'Yamaha', 'Honda', 'Vento', 'Veloci', 'Suzuki', 'Otra'] as const;

const currentYear = new Date().getFullYear();
export const vehicleYears = Array.from({ length: currentYear - 2010 + 2 }, (_, i) => (currentYear + 1 - i).toString());
