"use client";

import { useState } from 'react';
import { useDebounce } from 'use-debounce';

export type Filters = {
    name: string;
    status: string;
    type: string;
    categoryId: string;
}

export function useBusinessFilters() {
    const [filters, setFilters] = useState<Filters>({
        name: '',
        status: '',
        type: '',
        categoryId: '',
    });

    const [debouncedSearch] = useDebounce(filters.name, 500);

    return {
        filters: {
            status: filters.status,
            type: filters.type,
            categoryId: filters.categoryId,
        },
        setFilters,
        search: filters.name,
        debouncedSearch,
    };
}
