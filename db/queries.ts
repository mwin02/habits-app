/**
 * Barrel for all database query modules.
 *
 * Implementations live in `db/queries/<domain>.ts`. This file exists so that
 * existing import paths (`@/db/queries`) keep working — new code is welcome
 * to import from a domain file directly if a callsite only needs one slice.
 */

export * from './queries/categories';
export * from './queries/activities';
export * from './queries/time-entries';
export * from './queries/timeline';
export * from './queries/insights';
export * from './queries/recommendations';
export * from './queries/ideal-allocations';
export * from './queries/notifications';
export * from './queries/tags';
