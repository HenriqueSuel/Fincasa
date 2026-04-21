"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireHouseholdContext } from "@/lib/auth/guards";
import { applyFieldErrors, type ActionState } from "@/lib/action-state";
import { parseLocalDate } from "@/lib/dates";
import {
  computeInstallmentDates,
  firstInvoiceDueDate,
} from "@/lib/installments";
import { getCard } from "@/lib/cards-query";
import {
  loanSchema,
  repaymentSchema,
  updateLoanSchema,
  type LoanInput,
  type RepaymentInput,
  type UpdateLoanInput,
} from "@/lib/validators";

export type LoanState = ActionState<keyof LoanInput>;
export type RepaymentState = ActionState<keyof RepaymentInput>;
export type UpdateLoanState = ActionState<keyof UpdateLoanInput>;

function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parseLoanFormData(formData: FormData) {
  const rawDate = String(formData.get("lendDate") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  const rawCard = String(formData.get("cardId") ?? "").trim();
  return loanSchema.safeParse({
    debtorName: String(formData.get("debtorName") ?? ""),
    totalAmount: formData.get("totalAmount"),
    lendDate: parsedDate ?? rawDate,
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    cardId: rawCard || undefined,
    installments: formData.get("installments") ?? 1,
    description: String(formData.get("description") ?? "").trim() || undefined,
  });
}

function parseUpdateLoanFormData(formData: FormData) {
  const rawDate = String(formData.get("lendDate") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  return updateLoanSchema.safeParse({
    debtorName: String(formData.get("debtorName") ?? ""),
    totalAmount: formData.get("totalAmount"),
    lendDate: parsedDate ?? rawDate,
    description: String(formData.get("description") ?? "").trim() || undefined,
  });
}

function parseRepaymentFormData(formData: FormData) {
  const rawDate = String(formData.get("paidAt") ?? "");
  const parsedDate = parseLocalDate(rawDate);
  const rawMethod = String(formData.get("paymentMethod") ?? "").trim();
  return repaymentSchema.safeParse({
    amount: formData.get("amount"),
    paidAt: parsedDate ?? rawDate,
    paymentMethod: rawMethod || undefined,
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
}

export async function createLoan(
  _prev: LoanState | undefined,
  formData: FormData,
): Promise<LoanState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseLoanFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const installments =
    values.paymentMethod === "credit" ? values.installments : 1;
  const cardId =
    values.paymentMethod === "credit" ? values.cardId ?? undefined : undefined;

  const card = cardId ? await getCard(householdId, cardId) : null;

  const dates =
    values.paymentMethod === "credit"
      ? computeInstallmentDates(values.lendDate, installments, card)
      : [values.lendDate];

  const totalCents = Math.round(values.totalAmount * 100);
  const baseCents = Math.floor(totalCents / installments);
  const remainderCents = totalCents - baseCents * installments;

  const db = adminDb();
  const loanRef = db
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .doc();
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");

  const now = Timestamp.now();
  const schedule: {
    dueDate: Timestamp;
    amount: number;
    transactionId: string;
  }[] = [];
  const txDocs: {
    ref: FirebaseFirestore.DocumentReference;
    data: Record<string, unknown>;
  }[] = [];

  for (let i = 0; i < installments; i++) {
    const cents = i === 0 ? baseCents + remainderCents : baseCents;
    const amount = cents / 100;
    const due =
      dates[i] ??
      (card ? firstInvoiceDueDate(values.lendDate, card) : values.lendDate);
    const ref = txCol.doc();
    schedule.push({
      dueDate: Timestamp.fromDate(due),
      amount,
      transactionId: ref.id,
    });
    txDocs.push({
      ref,
      data: {
        type: "expense",
        amount,
        description: `Empréstimo · ${values.debtorName}${
          installments > 1 ? ` (${i + 1}/${installments})` : ""
        }`,
        category: "loans",
        subcategory: "Empréstimo",
        date: Timestamp.fromDate(due),
        paymentMethod: values.paymentMethod,
        ...(cardId ? { cardId } : {}),
        loanId: loanRef.id,
        ...(installments > 1
          ? {
              installmentId: loanRef.id,
              installmentNumber: i + 1,
              installmentCount: installments,
              installmentTotal: values.totalAmount,
            }
          : {}),
        createdBy: uid,
        createdByName: user.name,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  const batch = db.batch();
  batch.set(loanRef, {
    debtorName: values.debtorName,
    debtorNameLower: values.debtorName.toLowerCase(),
    totalAmount: values.totalAmount,
    outstandingAmount: values.totalAmount,
    repaidAmount: 0,
    lendDate: Timestamp.fromDate(values.lendDate),
    paymentMethod: values.paymentMethod,
    ...(cardId ? { cardId } : {}),
    installments,
    ...(values.description ? { description: values.description } : {}),
    status: "active",
    schedule,
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  });
  for (const t of txDocs) batch.set(t.ref, t.data);
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/loans");
  revalidatePath("/transactions");
  redirect(`/loans/${loanRef.id}?toast=loan-created`);
}

export async function updateLoan(
  loanId: string,
  _prev: UpdateLoanState | undefined,
  formData: FormData,
): Promise<UpdateLoanState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseUpdateLoanFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const loanRef = db
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .doc(loanId);
  const loanSnap = await loanRef.get();
  const loan = loanSnap.data();
  if (!loan) return { error: "Empréstimo não encontrado." };
  if (loan.createdBy !== uid) {
    return { error: "Só quem lançou pode editar." };
  }
  if (loan.status === "cancelled") {
    return { error: "Empréstimo cancelado não pode ser editado." };
  }

  const hasRepayments = Number(loan.repaidAmount ?? 0) > 0;
  const structuralChange =
    !hasRepayments &&
    (Math.abs(
      Math.round(Number(loan.totalAmount ?? 0) * 100) -
        Math.round(values.totalAmount * 100),
    ) !== 0 ||
      (loan.lendDate as Timestamp).toDate().getTime() !==
        values.lendDate.getTime());

  if (hasRepayments) {
    const totalChanged =
      Math.abs(
        Math.round(Number(loan.totalAmount ?? 0) * 100) -
          Math.round(values.totalAmount * 100),
      ) !== 0;
    const dateChanged =
      (loan.lendDate as Timestamp).toDate().getTime() !==
      values.lendDate.getTime();
    if (totalChanged || dateChanged) {
      return {
        error:
          "Com pagamentos registrados só dá pra mudar nome e descrição. Apague os pagamentos pra alterar valor ou data.",
      };
    }
  }

  const now = Timestamp.now();
  const installments = Number(loan.installments ?? 1);
  const paymentMethod = String(loan.paymentMethod ?? "pix");
  const cardId = (loan.cardId as string | undefined) ?? null;

  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const txsSnap = await txCol.where("loanId", "==", loanId).get();
  const expenseDocs = txsSnap.docs.filter(
    (d) => d.data().type === "expense",
  );

  let newSchedule: {
    dueDate: Timestamp;
    amount: number;
    transactionId: string;
  }[] = [];

  if (structuralChange) {
    const card =
      cardId && paymentMethod === "credit"
        ? await getCard(householdId, cardId)
        : null;
    const dates =
      paymentMethod === "credit"
        ? computeInstallmentDates(values.lendDate, installments, card)
        : [values.lendDate];

    const totalCents = Math.round(values.totalAmount * 100);
    const baseCents = Math.floor(totalCents / installments);
    const remainderCents = totalCents - baseCents * installments;

    const existingSchedule = Array.isArray(loan.schedule) ? loan.schedule : [];
    for (let i = 0; i < installments; i++) {
      const cents = i === 0 ? baseCents + remainderCents : baseCents;
      const amount = cents / 100;
      const due =
        dates[i] ??
        (card ? firstInvoiceDueDate(values.lendDate, card) : values.lendDate);
      const existingTxId = existingSchedule[i]?.transactionId as
        | string
        | undefined;
      newSchedule.push({
        dueDate: Timestamp.fromDate(due),
        amount,
        transactionId: existingTxId ?? txCol.doc().id,
      });
    }
  } else {
    newSchedule = (Array.isArray(loan.schedule) ? loan.schedule : []).map(
      (s: {
        dueDate: Timestamp;
        amount: number;
        transactionId: string;
      }) => ({
        dueDate: s.dueDate,
        amount: s.amount,
        transactionId: s.transactionId,
      }),
    );
  }

  const batch = db.batch();

  const outstandingNow = roundCents(
    values.totalAmount - Number(loan.repaidAmount ?? 0),
  );

  batch.update(loanRef, {
    debtorName: values.debtorName,
    debtorNameLower: values.debtorName.toLowerCase(),
    totalAmount: values.totalAmount,
    outstandingAmount: Math.max(0, outstandingNow),
    lendDate: Timestamp.fromDate(values.lendDate),
    description: values.description ?? null,
    schedule: newSchedule,
    updatedAt: now,
  });

  const existingTxByNumber = new Map<number, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const d of expenseDocs) {
    const n = Number(d.data().installmentNumber ?? 1);
    existingTxByNumber.set(n, d);
  }

  for (let i = 0; i < installments; i++) {
    const entry = newSchedule[i]!;
    const existing = existingTxByNumber.get(i + 1);
    const desc = `Empréstimo · ${values.debtorName}${
      installments > 1 ? ` (${i + 1}/${installments})` : ""
    }`;
    const base = {
      description: desc,
      amount: entry.amount,
      date: entry.dueDate,
      ...(installments > 1 ? { installmentTotal: values.totalAmount } : {}),
      updatedAt: now,
    };
    if (existing) {
      batch.update(existing.ref, base);
    } else {
      batch.set(txCol.doc(entry.transactionId), {
        type: "expense",
        amount: entry.amount,
        description: desc,
        category: "loans",
        subcategory: "Empréstimo",
        date: entry.dueDate,
        paymentMethod,
        ...(cardId ? { cardId } : {}),
        loanId,
        ...(installments > 1
          ? {
              installmentId: loanId,
              installmentNumber: i + 1,
              installmentCount: installments,
              installmentTotal: values.totalAmount,
            }
          : {}),
        createdBy: uid,
        createdByName: user.name,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await batch.commit();

  revalidatePath("/");
  revalidatePath("/loans");
  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/transactions");
  redirect(`/loans/${loanId}?toast=loan-updated`);
}

export async function recordRepayment(
  loanId: string,
  _prev: RepaymentState | undefined,
  formData: FormData,
): Promise<RepaymentState> {
  const { uid, user, householdId } = await requireHouseholdContext();
  const parsed = parseRepaymentFormData(formData);
  if (!parsed.success) {
    return { fieldErrors: applyFieldErrors(parsed.error.issues) };
  }
  const values = parsed.data;

  const db = adminDb();
  const loanRef = db
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .doc(loanId);
  const loanSnap = await loanRef.get();
  const loan = loanSnap.data();
  if (!loan) return { error: "Empréstimo não encontrado." };
  if (loan.createdBy !== uid) {
    return { error: "Só quem lançou pode registrar pagamento." };
  }
  if (loan.status !== "active") {
    return { error: "Este empréstimo não está ativo." };
  }

  const outstanding = Number(loan.outstandingAmount ?? 0);
  if (values.amount - outstanding > 0.001) {
    return {
      fieldErrors: {
        amount: `Saldo restante é menor que o valor informado.`,
      },
    };
  }

  const now = Timestamp.now();
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const txRef = txCol.doc();
  const repaymentRef = loanRef.collection("repayments").doc();

  const newRepaid = roundCents(Number(loan.repaidAmount ?? 0) + values.amount);
  const newOutstanding = roundCents(
    Number(loan.totalAmount ?? 0) - newRepaid,
  );
  const isSettled = newOutstanding <= 0.001;

  const batch = db.batch();
  batch.set(txRef, {
    type: "income",
    amount: values.amount,
    description: `Pagamento · ${loan.debtorName}`,
    category: "loans",
    subcategory: "Pagamento de empréstimo",
    date: Timestamp.fromDate(values.paidAt),
    ...(values.paymentMethod ? { paymentMethod: values.paymentMethod } : {}),
    loanId,
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(repaymentRef, {
    amount: values.amount,
    paidAt: Timestamp.fromDate(values.paidAt),
    ...(values.paymentMethod ? { paymentMethod: values.paymentMethod } : {}),
    ...(values.note ? { note: values.note } : {}),
    transactionId: txRef.id,
    createdBy: uid,
    createdByName: user.name,
    createdAt: now,
  });
  batch.update(loanRef, {
    repaidAmount: newRepaid,
    outstandingAmount: isSettled ? 0 : newOutstanding,
    status: isSettled ? "settled" : "active",
    updatedAt: now,
  });
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/loans");
  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteRepayment(
  loanId: string,
  repaymentId: string,
) {
  const { uid, householdId } = await requireHouseholdContext();
  const db = adminDb();
  const loanRef = db
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .doc(loanId);

  const [loanSnap, repaymentSnap] = await Promise.all([
    loanRef.get(),
    loanRef.collection("repayments").doc(repaymentId).get(),
  ]);
  const loan = loanSnap.data();
  const repayment = repaymentSnap.data();
  if (!loan || !repayment) return;
  if (loan.createdBy !== uid) {
    throw new Error("Só quem lançou pode apagar pagamento.");
  }

  const newRepaid = roundCents(
    Math.max(0, Number(loan.repaidAmount ?? 0) - Number(repayment.amount ?? 0)),
  );
  const newOutstanding = roundCents(
    Number(loan.totalAmount ?? 0) - newRepaid,
  );
  const txRef = repayment.transactionId
    ? db
        .collection("households")
        .doc(householdId)
        .collection("transactions")
        .doc(repayment.transactionId)
    : null;

  const batch = db.batch();
  if (txRef) batch.delete(txRef);
  batch.delete(repaymentSnap.ref);
  batch.update(loanRef, {
    repaidAmount: newRepaid,
    outstandingAmount: newOutstanding,
    status: "active",
    updatedAt: Timestamp.now(),
  });
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/loans");
  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/transactions");
}

export async function cancelLoan(loanId: string) {
  const { uid, householdId } = await requireHouseholdContext();
  const db = adminDb();
  const loanRef = db
    .collection("households")
    .doc(householdId)
    .collection("loans")
    .doc(loanId);
  const loanSnap = await loanRef.get();
  const loan = loanSnap.data();
  if (!loan) return;
  if (loan.createdBy !== uid) {
    throw new Error("Só quem lançou pode apagar o empréstimo.");
  }

  // Read every transaction and repayment upfront (reads before writes).
  const txCol = db
    .collection("households")
    .doc(householdId)
    .collection("transactions");
  const [txSnap, repaymentsSnap] = await Promise.all([
    txCol.where("loanId", "==", loanId).get(),
    loanRef.collection("repayments").get(),
  ]);

  const batch = db.batch();
  for (const doc of txSnap.docs) batch.delete(doc.ref);
  for (const doc of repaymentsSnap.docs) batch.delete(doc.ref);
  batch.delete(loanRef);
  await batch.commit();

  revalidatePath("/");
  revalidatePath("/loans");
  revalidatePath("/transactions");
  redirect("/loans?toast=loan-cancelled");
}

