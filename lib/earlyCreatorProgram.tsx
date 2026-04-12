export const EARLY_CREATOR_BADGE_TITLE = "This is Exclusive Early Creator Badge";

export const EARLY_CREATOR_BADGE_DESCRIPTION =
	"This is for Exclusive Early Creators. It gives you homepage spotlight so every new user gets to see your content among our featured creators and one month of Basic monetization activated automatically.";

const DEFAULT_NEW_VIEWER_WINDOW_DAYS = 30;

type EarlyCreatorFields = {
	early_creator_program_until?: string | null;
};

const toTimestamp = (value?: string | null) => {
	if (!value) {
		return null;
	}

	const timestamp = new Date(value).getTime();
	return Number.isNaN(timestamp) ? null : timestamp;
};

export const isExclusiveEarlyCreator = (
	value?: EarlyCreatorFields | null,
) => {
	const timestamp = toTimestamp(value?.early_creator_program_until);
	if (!timestamp) {
		return false;
	}

	return timestamp > Date.now();
};

export const isNewViewerForEarlyCreatorSpotlight = (
	createdAt?: string | null,
	windowDays = DEFAULT_NEW_VIEWER_WINDOW_DAYS,
) => {
	const timestamp = toTimestamp(createdAt);
	if (!timestamp) {
		return false;
	}

	return Date.now() - timestamp <= windowDays * 24 * 60 * 60 * 1000;
};
