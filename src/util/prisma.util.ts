import { IntFilter, StringFilter } from "../generated/prisma/commonInputTypes";

export function optionalStringQuery<T>(
  queryKey: string | undefined,
  query: StringFilter<T>,
): StringFilter<T> {
  return queryKey ? query : {};
}

export function optionalIntQuery<T>(
  queryKey: number | undefined,
  query: IntFilter<T>,
): IntFilter<T> {
  return queryKey ? query : {};
}
