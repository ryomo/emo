/**
 * Composable for fetching available models from the server.
 */

export interface AvailableModel {
  id: string
  labels: string[]
  downloaded: boolean
}

interface ModelsApiResponse {
  data: {
    id: string
    labels?: string[]
    downloaded?: boolean
    [key: string]: unknown
  }[]
}

/**
 * Fetch models from the server, filtered by a required label.
 * Downloaded models are sorted first, then alphabetical.
 */
export function useAvailableModels(label: string) {
  const config = useConfig()

  const models = ref<AvailableModel[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchModels() {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<ModelsApiResponse>(
        `${config.lemonadeBaseUrl}/api/v1/models`,
        { params: { show_all: true } },
      )

      const filtered = (response.data ?? [])
        .filter((m) => m.labels?.includes(label))
        .map((m): AvailableModel => ({
          id: m.id,
          labels: m.labels ?? [],
          downloaded: m.downloaded ?? false,
        }))

      // Sort: downloaded first, then alphabetical
      filtered.sort((a, b) => {
        if (a.downloaded !== b.downloaded) return a.downloaded ? -1 : 1
        return a.id.localeCompare(b.id)
      })

      models.value = filtered
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'Failed to fetch models'
      console.error('Models API error:', e)
    } finally {
      isLoading.value = false
    }
  }

  return {
    models: readonly(models),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchModels,
  }
}
