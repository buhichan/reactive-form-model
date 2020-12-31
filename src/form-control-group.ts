import { combineLatest, EMPTY, identity, of, timer } from "rxjs"
import { debounce, debounceTime, map, scan, switchMap } from "rxjs/operators"
import { AbstractControl, FormControlOptions, ValidationInfo, ValueOfAbstractControl } from "./types"

//eslint-disable-next-line
export class FormControlGroup<
    Children extends Record<string, AbstractControl<any, any>>,
    Meta,
    Type = { [k in keyof Children]: ValueOfAbstractControl<Children[k]> }
> implements AbstractControl<Type, Meta> {
    constructor(public children: Children, private options?: FormControlOptions<Type, Meta>) {}
    metadata = this.options?.metadata || EMPTY
    private formEntries = (Object.keys(this.children) as (keyof Children)[]).map(k => {
        return [k, this.children[k]] as const
    })
    value = combineLatest(
        this.formEntries.map(([k, control]) => {
            return control.value.pipe(map(value => [k, value] as const))
        })
    ).pipe(
        debounce(async () => {}),
        map(kvs => {
            return kvs.reduce((res, [k, v]) => {
                res[k as keyof Type] = v
                return res
            }, {} as Type)
        }),
        this.options?.middleware ? scan((prev, cur) => this.options!.middleware!(cur, prev)) : identity
    )
    error = combineLatest([
        ...this.formEntries.map(([k, control]) => {
            return control.error
        }),
        !this.options?.validator ? of(null) : this.value.pipe(switchMap(this.options.validator)),
    ]).pipe(debounceTime(0), map(joinValidationInfo))
    change = (value: Type) => {
        for (const k in value) {
            this.children[k]?.change(value[k])
        }
    }
}

export function joinValidationInfo(validationInfo: ValidationInfo[]): ValidationInfo {
    let res: string[] = []
    for (const item of validationInfo) {
        if (!!item) {
            if (Array.isArray(item)) {
                res.push(...item)
            } else {
                res.push(item)
            }
        }
    }
    if (res.length) {
        return res
    }
}
