/**
 * Composable for app-wide error notifications displayed in app.vue.
 * Any composable can call setAppError() to show a banner to the user.
 */

const _appError = ref<string>('')

export function useAppError() {
  return readonly(_appError)
}

export function setAppError(message: string) {
  _appError.value = message
}
