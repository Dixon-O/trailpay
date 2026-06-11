import type { Contract, Leg, School, User, LegEvent } from "@/lib/db/schema";

export type ContractFull = {
  contract: Contract;
  school: School | undefined;
  sender: User | undefined;
  legs: Leg[];
  events: LegEvent[];
};

export type ContractListItem = {
  contract: Contract;
  school: School | undefined;
  legs: Leg[];
};

export type PendingItem = { contract: Contract; leg: Leg };

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResp<T> = ApiOk<T> | ApiErr;
