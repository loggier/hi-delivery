import { VehicleBrand } from "@/types";

export const vehicleBrands: readonly VehicleBrand[] = ['Italika', 'Yamaha', 'Honda', 'Vento', 'Veloci', 'Suzuki', 'Otra'] as const;

const currentYear = new Date().getFullYear();
export const vehicleYears = Array.from({ length: currentYear - 2010 + 2 }, (_, i) => (currentYear + 1 - i).toString());

export const areaColors = [
    '#FF5733', // Naranja rojizo
    '#33FF57', // Verde brillante
    '#3357FF', // Azul
    '#FF33A1', // Rosa
    '#FFC300', // Amarillo
    '#A133FF', // Púrpura
    '#33FFF6', // Cian
    '#FF8C33', // Naranja
    '#DAF7A6', // Verde pálido
    '#581845'  // Berenjena
] as const;
