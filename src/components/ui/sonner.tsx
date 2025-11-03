import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { useNotifications } from "@/hooks/useNotifications"
import { useEffect, type ReactNode } from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

// Wrapper do toast que também envia notificações push
let notificationService: ReturnType<typeof useNotifications> | null = null;

export const ToastNotificationProvider = ({ children }: { children: ReactNode }) => {
  const notifications = useNotifications();
  
  useEffect(() => {
    notificationService = notifications;
  }, [notifications]);
  
  return <>{children}</>;
};

const toast = {
  ...sonnerToast,
  success: (title: string, options?: { description?: string }) => {
    sonnerToast.success(title, options);
    if (notificationService?.permission === 'granted') {
      notificationService.showNotification({
        title: `✅ ${title}`,
        body: options?.description,
        tag: 'success'
      });
    }
  },
  error: (title: string, options?: { description?: string }) => {
    sonnerToast.error(title, options);
    if (notificationService?.permission === 'granted') {
      notificationService.showNotification({
        title: `❌ ${title}`,
        body: options?.description,
        tag: 'error',
        requireInteraction: true
      });
    }
  },
  warning: (title: string, options?: { description?: string }) => {
    sonnerToast.warning(title, options);
    if (notificationService?.permission === 'granted') {
      notificationService.showNotification({
        title: `⚠️ ${title}`,
        body: options?.description,
        tag: 'warning'
      });
    }
  },
  info: (title: string, options?: { description?: string }) => {
    sonnerToast.info(title, options);
    if (notificationService?.permission === 'granted') {
      notificationService.showNotification({
        title: `ℹ️ ${title}`,
        body: options?.description,
        tag: 'info'
      });
    }
  }
};

export { Toaster, toast }
