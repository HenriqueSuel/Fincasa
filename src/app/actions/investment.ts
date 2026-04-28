"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { applyFieldErrors, type ActionState } from "@/lib/action-state";
import { parseLocalDate } from "@/lib/dates";
import {
  investmentSchema,
  investmentContributionSchema,
  investmentRevaluationSchema,
  investmentWithdrawalSchema,
  updateInvestmentMetaSchema,
  type InvestmentContributionInput,
  type InvestmentInput,
  type InvestmentRevaluationInput,
  type InvestmentWithdrawalInput,
  type UpdateInvestmentMetaInput,
} from "@/lib/validators";
import { INVESTMENT_TYPE_LABELS } from "@/types/enums";

export type InvestmentState = ActionState<keyof InvestmentInput>;
export type InvestmentContributionState = ActionState<
  keyof InvestmentContributionInput
>;
export type InvestmentRevaluationState = ActionState<
  keyof InvestmentRevaluationInput
>;
export type InvestmentWithdrawalState = ActionState<
  keyof InvestmentWithdrawalInput
>;
export type UpdateInvestmentMetaState = ActionState<
  keyof UpdateInvestmentMetaInput
>;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseInvestmentFormData(formData: FormData) {
  const rawDate = String(formData.get("startDate") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  return investmentSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    broker: String(formData.get("broker") ?? "").trim() || undefined,
    initialAmount: formData.get("initialAmount") ?? 0,
    startDate: parsedDate ?? rawDate,
  });
}

function parseContributionFormData(formData: FormData) {
  const rawDate = String(formData.get("date") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  return investmentContributionSchema.safeParse({
    amount: formData.get("amount"),
    date: parsedDate ?? rawDate,
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
}

function parseRevaluationFormData(formData: FormData) {
  const rawDate = String(formData.get("date") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  return investmentRevaluationSchema.safeParse({
    newValue: formData.get("newValue"),
    date: parsedDate ?? rawDate,
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
}

function parseWithdrawalFormData(formData: FormData) {
  const rawDate = String(formData.get("date") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  return investmentWithdrawalSchema.safeParse({
    amount: formData.get("amount"),
    date: parsedDate ?? rawDate,
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
}

function parseUpdateMetaFormData(formData: FormData) {
  return updateInvestmentMetaSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    broker: String(formData.get("broker") ?? "").trim() || undefined,
  });
}

interface ReplayEvent {
  type: "contribution" | "revaluation" | "withdrawal";
  amount: number;
  newValue?: number;
  date: Date;
}

/**
 * Reaplica os eventos em ordem e retorna o `currentValue` e `totalContributed`
 * resultantes. Permite editar/apagar qualquer evento sem perder consistência.
 */
function replayEvents(events: ReplayEvent[]): {
  currentValue: number;
  totalContributed: number;
} {
  let currentValue = 0;
  let totalContributed = 0;
  for (const e of events) {
    if (e.type === "contribution") {
      currentValue += e.amount;
      totalContributed += e.amount;
    } else if (e.type === "revaluation") {
      if (typeof e.newValue === "number") currentValue = e.newValue;
    } else if (e.type === "withdrawal") {
      const proportion = currentValue > 0 ? e.amount / currentValue : 1;
      const contributedOut = totalContributed * proportion;
      currentValue = Math.max(0, currentValue - e.amount);
      totalContributed = Math.max(0, totalContributed - contributedOut);
    }
  }
  return {
    currentValue: roundCents(currentValue),
    totalContributed: roundCents(totalContributed),
  };
}

export async function createInvestment(
  goalId: string,
  _prev: InvestmentState | undefined,
  formData: FormData,
): Promise<InvestmentState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseInvestmentFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const goalSnap = await goalRef.get();
  if (!goalSnap.exists) return { error: "Meta não encontrada." };

  const investmentRef = goalRef.collection("investments").doc();
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const now = Timestamp.now();

  const batch = db.batch();
  const initial = values.initialAmount;

  batch.set(investmentRef, {
    name: values.name,
    type: values.type,
    ...(values.broker ? { broker: values.broker } : {}),
    currentValue: initial,
    totalContributed: initial,
    archived: false,
    lastUpdatedAt: now,
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
  });

  if (initial > 0) {
    const txRef = txCol.doc();
    const eventRef = investmentRef.collection("events").doc();
    batch.set(txRef, {
      type: "investment",
      investmentDirection: "out",
      amount: initial,
      description: `Aporte · ${values.name}`,
      category: "goals",
      subcategory: "Aporte",
      customSubcategory: INVESTMENT_TYPE_LABELS[values.type],
      goalId,
      investmentId: investmentRef.id,
      date: Timestamp.fromDate(values.startDate),
      createdBy: uid,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(eventRef, {
      type: "contribution",
      amount: initial,
      date: Timestamp.fromDate(values.startDate),
      transactionId: txRef.id,
      createdBy: uid,
      createdByName: user.name,
      createdAt: now,
    });
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(initial),
    });
  }

  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentRef.id}`);
  revalidatePath("/transactions");
  redirect(`/goals/${goalId}/investments/${investmentRef.id}?toast=inv-created`);
}

export async function contributeInvestment(
  goalId: string,
  investmentId: string,
  _prev: InvestmentContributionState | undefined,
  formData: FormData,
): Promise<InvestmentContributionState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseContributionFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return { error: "Investimento não encontrado." };
  if (inv.archived) return { error: "Investimento arquivado." };

  const now = Timestamp.now();
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const txRef = txCol.doc();
  const eventRef = investmentRef.collection("events").doc();

  const batch = db.batch();
  batch.set(txRef, {
    type: "investment",
    investmentDirection: "out",
    amount: values.amount,
    description: `Aporte · ${inv.name}`,
    category: "goals",
    subcategory: "Aporte",
    customSubcategory:
      INVESTMENT_TYPE_LABELS[inv.type as keyof typeof INVESTMENT_TYPE_LABELS] ??
      "Investimento",
    goalId,
    investmentId,
    date: Timestamp.fromDate(values.date),
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(eventRef, {
    type: "contribution",
    amount: values.amount,
    date: Timestamp.fromDate(values.date),
    ...(values.note ? { note: values.note } : {}),
    transactionId: txRef.id,
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
  });
  batch.update(investmentRef, {
    currentValue: FieldValue.increment(values.amount),
    totalContributed: FieldValue.increment(values.amount),
    lastUpdatedAt: now,
  });
  batch.update(goalRef, {
    currentAmount: FieldValue.increment(values.amount),
  });
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
  revalidatePath("/transactions");
  return { success: true };
}

export async function revalueInvestment(
  goalId: string,
  investmentId: string,
  _prev: InvestmentRevaluationState | undefined,
  formData: FormData,
): Promise<InvestmentRevaluationState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseRevaluationFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return { error: "Investimento não encontrado." };
  if (inv.archived) return { error: "Investimento arquivado." };

  const previous = Number(inv.currentValue ?? 0);
  const delta = roundCents(values.newValue - previous);

  const now = Timestamp.now();
  const eventRef = investmentRef.collection("events").doc();
  const batch = db.batch();
  batch.set(eventRef, {
    type: "revaluation",
    amount: delta,
    previousValue: previous,
    newValue: values.newValue,
    date: Timestamp.fromDate(values.date),
    ...(values.note ? { note: values.note } : {}),
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
  });
  batch.update(investmentRef, {
    currentValue: values.newValue,
    lastUpdatedAt: now,
  });
  if (delta !== 0) {
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(delta),
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
  return { success: true };
}

export async function withdrawInvestment(
  goalId: string,
  investmentId: string,
  _prev: InvestmentWithdrawalState | undefined,
  formData: FormData,
): Promise<InvestmentWithdrawalState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseWithdrawalFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return { error: "Investimento não encontrado." };
  if (inv.archived) return { error: "Investimento arquivado." };

  const currentValue = Number(inv.currentValue ?? 0);
  const totalContributed = Number(inv.totalContributed ?? 0);

  if (values.amount - currentValue > 0.001) {
    return {
      fieldErrors: {
        amount: "Valor maior que a posição atual.",
      },
    };
  }

  const isFull = Math.abs(currentValue - values.amount) < 0.001;
  const proportion = currentValue > 0 ? values.amount / currentValue : 1;
  const contributedOut = isFull
    ? totalContributed
    : roundCents(totalContributed * proportion);
  const newCurrentValue = isFull
    ? 0
    : roundCents(currentValue - values.amount);
  const newTotalContributed = isFull
    ? 0
    : roundCents(totalContributed - contributedOut);

  const now = Timestamp.now();
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const txRef = txCol.doc();
  const eventRef = investmentRef.collection("events").doc();

  const batch = db.batch();
  batch.set(txRef, {
    type: "investment",
    investmentDirection: "in",
    amount: values.amount,
    description: `Resgate · ${inv.name}`,
    category: "goals",
    subcategory: "Resgate",
    customSubcategory:
      INVESTMENT_TYPE_LABELS[inv.type as keyof typeof INVESTMENT_TYPE_LABELS] ??
      "Investimento",
    goalId,
    investmentId,
    date: Timestamp.fromDate(values.date),
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(eventRef, {
    type: "withdrawal",
    amount: values.amount,
    previousValue: currentValue,
    newValue: newCurrentValue,
    date: Timestamp.fromDate(values.date),
    ...(values.note ? { note: values.note } : {}),
    transactionId: txRef.id,
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
  });
  const investmentUpdate: Record<string, unknown> = {
    currentValue: newCurrentValue,
    totalContributed: newTotalContributed,
    lastUpdatedAt: now,
  };
  if (isFull) investmentUpdate.archived = true;
  batch.update(investmentRef, investmentUpdate);
  batch.update(goalRef, {
    currentAmount: FieldValue.increment(-values.amount),
  });
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
  revalidatePath("/transactions");
  return { success: true };
}

export async function archiveInvestment(
  goalId: string,
  investmentId: string,
) {
  const { householdId } = await requireHouseholdContext();
  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return;
  if (inv.archived) return;

  const currentValue = Number(inv.currentValue ?? 0);

  const batch = db.batch();
  batch.update(investmentRef, {
    archived: true,
    lastUpdatedAt: Timestamp.now(),
  });
  if (currentValue !== 0) {
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(-currentValue),
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
}

/**
 * Edita metadados do investimento (nome, tipo, corretora). Não toca valores.
 * Também propaga o novo nome pras descrições das transações vinculadas.
 */
export async function updateInvestment(
  goalId: string,
  investmentId: string,
  _prev: UpdateInvestmentMetaState | undefined,
  formData: FormData,
): Promise<UpdateInvestmentMetaState> {
  const { householdId } = await requireHouseholdContext();
  const parsed = parseUpdateMetaFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return { error: "Investimento não encontrado." };

  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const txsSnap = await txCol.where("investmentId", "==", investmentId).get();

  const now = Timestamp.now();
  const batch = db.batch();
  batch.update(investmentRef, {
    name: values.name,
    type: values.type,
    broker: values.broker ?? null,
    lastUpdatedAt: now,
  });
  // Atualiza descrição das transações com o novo nome.
  for (const doc of txsSnap.docs) {
    const d = doc.data();
    const isWithdraw = d.investmentDirection === "in";
    const newDesc = `${isWithdraw ? "Resgate" : "Aporte"} · ${values.name}`;
    batch.update(doc.ref, {
      description: newDesc,
      customSubcategory: INVESTMENT_TYPE_LABELS[values.type],
      updatedAt: now,
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
  revalidatePath("/transactions");
  redirect(
    `/goals/${goalId}/investments/${investmentId}?toast=inv-updated`,
  );
}

/**
 * Edita um evento (aporte ou revaluation). Replay completo dos eventos pra
 * recalcular currentValue/totalContributed; ajusta goal.currentAmount pelo
 * delta resultante. Withdrawal não é editável (use apagar + recriar).
 */
export async function updateInvestmentEvent(
  goalId: string,
  investmentId: string,
  eventId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const eventRef = investmentRef.collection("events").doc(eventId);

  const [invSnap, eventSnap, eventsSnap] = await Promise.all([
    investmentRef.get(),
    eventRef.get(),
    investmentRef.collection("events").orderBy("date", "asc").get(),
  ]);
  const inv = invSnap.data();
  const event = eventSnap.data();
  if (!inv) return { error: "Investimento não encontrado." };
  if (!event) return { error: "Evento não encontrado." };
  const eventType = event.type as "contribution" | "revaluation" | "withdrawal";
  if (eventType === "withdrawal") {
    return { error: "Edição de resgate não é suportada. Apague e crie de novo." };
  }

  // Validação por tipo
  let newAmount: number | undefined;
  let newNewValue: number | undefined;
  let newDate: Date | null = null;
  let newNote: string | undefined;
  if (eventType === "contribution") {
    const parsed = investmentContributionSchema.safeParse({
      amount: formData.get("amount"),
      date:
        parseLocalDate(String(formData.get("date") ?? "")) ??
        String(formData.get("date") ?? ""),
      note: String(formData.get("note") ?? "").trim() || undefined,
    });
    if (!parsed.success) {
      return { fieldErrors: applyFieldErrors(parsed.error.issues) };
    }
    newAmount = parsed.data.amount;
    newDate = parsed.data.date;
    newNote = parsed.data.note;
  } else {
    const parsed = investmentRevaluationSchema.safeParse({
      newValue: formData.get("newValue"),
      date:
        parseLocalDate(String(formData.get("date") ?? "")) ??
        String(formData.get("date") ?? ""),
      note: String(formData.get("note") ?? "").trim() || undefined,
    });
    if (!parsed.success) {
      return { fieldErrors: applyFieldErrors(parsed.error.issues) };
    }
    newNewValue = parsed.data.newValue;
    newDate = parsed.data.date;
    newNote = parsed.data.note;
  }

  // Replay com a substituição aplicada
  const replayInput: ReplayEvent[] = eventsSnap.docs
    .map((d) => {
      const data = d.data();
      const isEdited = d.id === eventId;
      const date =
        isEdited && newDate
          ? newDate
          : (data.date as Timestamp).toDate();
      const baseType = data.type as ReplayEvent["type"];
      if (isEdited && eventType === "contribution") {
        return {
          type: "contribution" as const,
          amount: newAmount!,
          date,
        };
      }
      if (isEdited && eventType === "revaluation") {
        return {
          type: "revaluation" as const,
          amount: 0,
          newValue: newNewValue!,
          date,
        };
      }
      return {
        type: baseType,
        amount: Number(data.amount ?? 0),
        newValue:
          typeof data.newValue === "number" ? data.newValue : undefined,
        date: (data.date as Timestamp).toDate(),
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const newState = replayEvents(replayInput);
  const oldCurrentValue = Number(inv.currentValue ?? 0);
  const deltaGoal = roundCents(newState.currentValue - oldCurrentValue);

  const now = Timestamp.now();
  const batch = db.batch();

  // Update event doc
  if (eventType === "contribution") {
    batch.update(eventRef, {
      amount: newAmount,
      date: Timestamp.fromDate(newDate!),
      note: newNote ?? null,
    });
    // Update linked transaction
    if (event.transactionId) {
      const txRef = db
        .collection("households")
        .doc(householdId)
        .collection("transactions")
        .doc(event.transactionId as string);
      batch.update(txRef, {
        amount: newAmount,
        date: Timestamp.fromDate(newDate!),
        description: `Aporte · ${inv.name}`,
        updatedAt: now,
        createdBy: uid,
        createdByName: user.name,
      });
    }
  } else {
    // revaluation: amount = newValue - previousValue. previousValue depende
    // do estado pré-evento no replay; vamos extrair do replay.
    const previousValue = (() => {
      let cv = 0;
      let tc = 0;
      for (const e of replayInput) {
        if (e.date.getTime() === newDate!.getTime() && e.newValue === newNewValue) {
          return cv;
        }
        if (e.type === "contribution") {
          cv += e.amount;
          tc += e.amount;
        } else if (e.type === "revaluation" && typeof e.newValue === "number") {
          cv = e.newValue;
        } else if (e.type === "withdrawal") {
          const prop = cv > 0 ? e.amount / cv : 1;
          cv = Math.max(0, cv - e.amount);
          tc = Math.max(0, tc - tc * prop);
        }
      }
      return cv;
    })();
    batch.update(eventRef, {
      newValue: newNewValue,
      previousValue,
      amount: roundCents(newNewValue! - previousValue),
      date: Timestamp.fromDate(newDate!),
      note: newNote ?? null,
    });
  }

  batch.update(investmentRef, {
    currentValue: newState.currentValue,
    totalContributed: newState.totalContributed,
    lastUpdatedAt: now,
  });
  if (deltaGoal !== 0) {
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(deltaGoal),
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
  revalidatePath("/transactions");
  return { success: true };
}

/**
 * Apaga um evento (aporte ou revaluation). Replay sem o evento pra recalcular
 * currentValue/totalContributed; ajusta goal.currentAmount pelo delta. Apaga
 * a transação vinculada se existir.
 */
export async function deleteInvestmentEvent(
  goalId: string,
  investmentId: string,
  eventId: string,
) {
  const { householdId } = await requireHouseholdContext();
  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const eventRef = investmentRef.collection("events").doc(eventId);

  const [invSnap, eventSnap, eventsSnap] = await Promise.all([
    investmentRef.get(),
    eventRef.get(),
    investmentRef.collection("events").orderBy("date", "asc").get(),
  ]);
  const inv = invSnap.data();
  const event = eventSnap.data();
  if (!inv || !event) return;
  const eventType = event.type as "contribution" | "revaluation" | "withdrawal";
  if (eventType === "withdrawal") {
    throw new Error(
      "Não é possível apagar resgate por aqui — apague o investimento se foi um erro.",
    );
  }

  const replayInput: ReplayEvent[] = eventsSnap.docs
    .filter((d) => d.id !== eventId)
    .map((d) => {
      const data = d.data();
      return {
        type: data.type as ReplayEvent["type"],
        amount: Number(data.amount ?? 0),
        newValue:
          typeof data.newValue === "number" ? data.newValue : undefined,
        date: (data.date as Timestamp).toDate(),
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const newState = replayEvents(replayInput);
  const oldCurrentValue = Number(inv.currentValue ?? 0);
  const deltaGoal = roundCents(newState.currentValue - oldCurrentValue);

  const now = Timestamp.now();
  const batch = db.batch();
  batch.delete(eventRef);
  if (event.transactionId) {
    const txRef = db
      .collection("households")
      .doc(householdId)
      .collection("transactions")
      .doc(event.transactionId as string);
    batch.delete(txRef);
  }
  batch.update(investmentRef, {
    currentValue: newState.currentValue,
    totalContributed: newState.totalContributed,
    lastUpdatedAt: now,
  });
  if (deltaGoal !== 0) {
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(deltaGoal),
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
  revalidatePath("/transactions");
}

/**
 * Migra transações antigas (pré type=investment) que estão ligadas a algum
 * investmentId mas foram criadas com type=expense (aporte) ou type=income
 * (resgate). Atualiza pra type=investment + investmentDirection correto.
 *
 * Idempotente: transações já no formato novo são ignoradas.
 */
export async function migrateInvestmentTransactions(): Promise<{
  migrated: number;
  skipped: number;
}> {
  const { householdId } = await requireHouseholdContext();
  const db = adminDb();
  const snap = await db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .get();

  let migrated = 0;
  let skipped = 0;
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let inBatch = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.investmentId) continue;
    if (d.type === "investment") {
      skipped++;
      continue;
    }
    let direction: "out" | "in" | null = null;
    if (d.type === "expense") direction = "out";
    else if (d.type === "income") direction = "in";
    if (!direction) {
      skipped++;
      continue;
    }
    batch.update(doc.ref, {
      type: "investment",
      investmentDirection: direction,
      updatedAt: Timestamp.now(),
    });
    migrated++;
    inBatch++;
    if (inBatch >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) await batch.commit();

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  revalidatePath("/goals");
  return { migrated, skipped };
}

export async function unarchiveInvestment(
  goalId: string,
  investmentId: string,
) {
  const { householdId } = await requireHouseholdContext();
  const db = adminDb();
  const goalRef = db
    .collection("households")
    .doc(householdId)
    .collection("goals")
    .doc(goalId);
  const investmentRef = goalRef.collection("investments").doc(investmentId);
  const invSnap = await investmentRef.get();
  const inv = invSnap.data();
  if (!inv) return;
  if (!inv.archived) return;

  const currentValue = Number(inv.currentValue ?? 0);

  const batch = db.batch();
  batch.update(investmentRef, {
    archived: false,
    lastUpdatedAt: Timestamp.now(),
  });
  if (currentValue !== 0) {
    batch.update(goalRef, {
      currentAmount: FieldValue.increment(currentValue),
    });
  }
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath(`/goals/${goalId}/investments/${investmentId}`);
}
