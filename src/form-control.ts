import { EMPTY, Subject, identity, Observable, of } from "rxjs"
import { scan, startWith, publishReplay, refCount, switchMap } from "rxjs/operators"
import { AbstractControl, FormControlOptions, ValidationInfo } from "./types"

export class FormControl<Type, Meta = never> implements AbstractControl<Type, Meta> {
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
    error = !this.options?.validator ? of(null) : this.value.pipe(switchMap(this.options.validator))
}
