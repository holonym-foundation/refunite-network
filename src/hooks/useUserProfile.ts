import { useFireproof } from "use-fireproof";

interface UserProfile {
  _id: string;
  address: string;
  displayName: string;
  updatedAt: number;
}

export function useUserProfile(address: string) {
  const { useDocument } = useFireproof("refunite-profiles");

  const {
    doc: profile,
    merge: mergeProfile,
    save: saveProfile,
    reset: resetProfile,
  } = useDocument<UserProfile>(() => ({
    _id: `user-profile-${address}`,
    address,
    displayName: "",
    updatedAt: Date.now(),
  }));

  return {
    profile,
    saveProfile,
    mergeProfile,
    resetProfile,
  };
}
