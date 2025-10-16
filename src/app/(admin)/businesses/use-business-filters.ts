"use client";

import { useState } from 'react';
import { useDebounce } from 'use-debounce';

export type Filters = {
    name: string;
    status: string;
    type: string;
    category_id: string;
}

export function useBusinessFilters() {
    const [filters, setFilters] = useState<Filters>({
        name: '',
        status: '',
        type: '',
        category_id: '',
    });

    const [debouncedSearch] = useDebounce(filters.name, 500);

    const setSearch = (value: string) => {
        setFilters(prev => ({...prev, name: value}));
    }

    return {
        filters: {
            status: filters.status,
            type: filters.type,
            category_id: filters.category_id,
        },
        setFilters,
        search: filters.name,
        setSearch,
        debouncedSearch,
    };
}
