import { writable, derived } from 'svelte/store';

export type SortDirection = 'asc' | 'desc';

export interface UseTableOptions {
	initialPage?: number;
	initialPerPage?: number;
	initialSortKey?: string;
	initialSortDirection?: SortDirection;
}

export interface FetchParams {
	page: number;
	per_page: number;
	sort_by?: string;
	sort_direction?: SortDirection;
	search?: string;
}

export function useTable(options: UseTableOptions = {}) {
	const {
		initialPage = 1,
		initialPerPage = 25,
		initialSortKey = '',
		initialSortDirection = 'asc'
	} = options;

	const page = writable(initialPage);
	const perPage = writable(initialPerPage);
	const totalItems = writable(0);
	const sortKey = writable(initialSortKey);
	const sortDirection = writable<SortDirection>(initialSortDirection);
	const search = writable('');
	const loading = writable(false);

	const totalPages = derived([totalItems, perPage], ([$total, $perPage]) =>
		Math.max(1, Math.ceil($total / $perPage))
	);

	const fetchParams = derived(
		[page, perPage, sortKey, sortDirection, search],
		([$page, $perPage, $sortKey, $sortDir, $search]): FetchParams => ({
			page: $page,
			per_page: $perPage,
			...($sortKey ? { sort_by: $sortKey, sort_direction: $sortDir } : {}),
			...($search ? { search: $search } : {})
		})
	);

	function setPage(p: number) {
		page.set(p);
	}

	function setPerPage(pp: number) {
		perPage.set(pp);
		page.set(1);
	}

	function toggleSort(key: string) {
		sortDirection.update((dir) => {
			if (sortKey === key) {
				return dir === 'asc' ? 'desc' : 'asc';
			}
			return 'asc';
		});
		sortKey.set(key);
		page.set(1);
	}

	function setSearch(query: string) {
		search.set(query);
		page.set(1);
	}

	function setTotalItems(total: number) {
		totalItems.set(total);
	}

	function setLoading(isLoading: boolean) {
		loading.set(isLoading);
	}

	function reset() {
		page.set(initialPage);
		perPage.set(initialPerPage);
		sortKey.set(initialSortKey);
		sortDirection.set(initialSortDirection);
		search.set('');
		totalItems.set(0);
	}

	return {
		page,
		perPage,
		totalItems,
		totalPages,
		sortKey,
		sortDirection,
		search,
		loading,
		fetchParams,
		setPage,
		setPerPage,
		toggleSort,
		setSearch,
		setTotalItems,
		setLoading,
		reset
	};
}

export type UseTableReturn = ReturnType<typeof useTable>;
