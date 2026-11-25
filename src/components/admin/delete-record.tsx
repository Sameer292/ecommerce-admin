import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type { MutationResult } from "@/server/mutation.types";
import { AdminForm } from "./admin-form";

type DeleteRecordProps = {
	id: string;
	record: string;
	name: string;
	blockedReason?: string;
	onDelete: (data: FormData) => Promise<MutationResult>;
	onSuccess: () => unknown;
};

export const DeleteRecord = ({
	id,
	record,
	name,
	blockedReason,
	onDelete,
	onSuccess,
}: DeleteRecordProps) => (
	<Dialog>
		<DialogTrigger render={<Button variant="destructive" size="lg" />}>
			<HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
			Delete
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Delete {name}?</DialogTitle>
				<DialogDescription>
					{blockedReason ?? `This permanently removes the ${record} from your store.`}
				</DialogDescription>
			</DialogHeader>
			{!blockedReason && (
				<AdminForm
					onSave={onDelete}
					onSuccess={onSuccess}
					submitLabel={`Delete ${record}`}
					successMessage={`${name} deleted.`}
					destructive
				>
					<input type="hidden" name="id" value={id} />
				</AdminForm>
			)}
		</DialogContent>
	</Dialog>
);
