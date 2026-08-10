type RefetchFn = () => Promise<unknown>

const queries = new Set<{ refetch: RefetchFn }>()

const addQueryToRefetch = (query: { refetch: RefetchFn }) => {
	queries.add(query)
	return () => queries.delete(query)
}

const refetchPoses = () => Promise.allSettled([...queries].map((query) => query.refetch()))

export const useRefetchPoses = () => {
	return {
		addQueryToRefetch,
		refetchPoses,
	}
}
