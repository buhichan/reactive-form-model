import { EMPTY, identity, of, Subject } from "rxjs"
import { publishReplay, refCount, scan, startWith, switchMap } from "rxjs/operators"
import { AbstractControl, FormControlOptions, HasRef } from "./types"

export class FormControl<Type, Meta = never> implements AbstractControl<Type, Meta>, HasRef {
    constructor(public defaultValue: Type, protected options?: FormControlOptions<Type, Meta>) {}
    metadata = this.options?.metadata || EMPTY
    private change$ = new Subject<Type>()
    change = (v: Type) => {
        this.change$.next(v)
    }
    value = this.change$.pipe(
        this.options?.middleware ? scan((prev, cur) => this.options!.middleware!(cur, prev)) : identity,
        startWith(this.defaultValue),
        publishReplay(1),
        refCount()
    )
    error = !this.options?.validator ? of(null) : this.value.pipe(switchMap(this.options.validator), publishReplay(1), refCount())

    dom: HTMLElement | null = null
    domRef = (ref: HTMLElement | null) => {
        this.dom = ref
    }
}
