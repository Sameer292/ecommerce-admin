import { Toast } from "@base-ui/react/toast";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Button } from "./button";

const ToastMessages = () => {
	const { toasts } = Toast.useToastManager();
	return (
		<Toast.Portal>
			<Toast.Viewport className="fixed inset-x-4 top-16 z-50 sm:right-6 sm:left-auto sm:w-80">
				{toasts.map((toast) => (
					<Toast.Root
						key={toast.id}
						toast={toast}
						className="flex min-w-0 items-start justify-between gap-2 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-md data-limited:hidden"
					>
						<Toast.Title className="min-w-0 flex-1 wrap-anywhere py-1" />
						<Toast.Close
							render={<Button variant="ghost" size="icon-xs" aria-label="Dismiss notification" />}
						>
							<HugeiconsIcon icon={Cancel01Icon} aria-hidden />
						</Toast.Close>
					</Toast.Root>
				))}
			</Toast.Viewport>
		</Toast.Portal>
	);
};

export const ToastProvider = ({ children }: { children: ReactNode }) => (
	<Toast.Provider limit={1}>
		{children}
		<ToastMessages />
	</Toast.Provider>
);

export const useToastManager = Toast.useToastManager;
