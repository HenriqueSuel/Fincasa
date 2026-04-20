/**
 * Shape padrão de retorno das Server Actions.
 *
 *   - `success`: true quando a ação foi concluída (para ações que não
 *     redirecionam).
 *   - `error`: mensagem de erro genérica (pra toast).
 *   - `fieldErrors`: mensagens por campo do form (pra form.setError ou
 *     FormMessage do shadcn).
 *
 * O generic `TField` tipa as chaves permitidas em `fieldErrors` de acordo
 * com o form — evita typos silenciosos em `setError(...)`.
 */
export interface ActionState<TField extends string = string> {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<TField, string>>;
}

/**
 * Converte as `issues` de um `SafeParseReturn` do Zod em um objeto de
 * `fieldErrors`. Usa sempre a primeira mensagem por caminho, pra não
 * sobrescrever erros já registrados em campos com múltiplas regras.
 *
 * Aceita `PropertyKey[]` pro `path` porque Zod v4 inclui symbol no tipo
 * (mesmo que na prática sempre venha string|number em forms).
 */
export function applyFieldErrors<TField extends string = string>(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): Partial<Record<TField, string>> {
  const out: Partial<Record<TField, string>> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "_") as TField;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
