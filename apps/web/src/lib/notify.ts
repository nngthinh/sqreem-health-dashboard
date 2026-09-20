import { toast } from 'sonner'

// The only module that imports sonner, so call sites never touch the library.
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
}
