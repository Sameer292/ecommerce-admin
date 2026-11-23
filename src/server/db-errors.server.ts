export const databaseCode = (error: unknown) => {
	const cause = error instanceof Error && error.cause ? error.cause : error;
	return typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
};
