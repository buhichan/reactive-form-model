import { Observable, ObservableInput } from "rxjs"

export interface AbstractControl<Type = unknown, Meta = unknown> {
    value: Observable<Type>
    error: Observable<ValidationInfo>
    change(value: Type): void
    metadata: Observable<Meta>
}
export type ValidationInfo = string[] | string | void | null | undefined

/**
 * ObservableInput: Promise, Observable and Array are all ObservableInputs.
 */
export type Validator<Type> = (v: Type) => ObservableInput<ValidationInfo>

export type FormControlOptions<Type, Meta> = {
    validator?: Validator<Type>
    middleware?: (nextValue: Type, prevValue: Type | undefined) => Type
    metadata?: Observable<Meta>
}

export type ValueOfAbstractControl<T> = T extends AbstractControl<infer V> ? V : never

export interface HasRef<Element = HTMLElement> {
    dom: Element | null
    domRef(ref: Element | null): void
}
