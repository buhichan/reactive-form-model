import { combineLatest, EMPTY, identity, of, timer } from "rxjs"
import { debounce, debounceTime, map, scan, switchMap } from "rxjs/operators"
import { AbstractControl, FormControlOptions, HasRef, ValidationInfo, ValueOfAbstractControl } from "./types"

//eslint-disable-next-line
export class FormControlGroup<
    Children extends Record<string, AbstractControl<any, any>>,
    Meta,
    Type = { [k in keyof Children]: ValueOfAbstractControl<Children[k]> }
> implements AbstractControl<Type, Meta>, HasRef {
    constructor(public children: Children, private options?: Omit<FormControlOptions<Type, Meta>, "middleware">) {}
    metadata = this.options?.metadata || EMPTY
    private formEntries = (Object.keys(this.children) as (keyof Children)[]).map(k => {
        return [k, this.children[k]] as const
    })
    value = combineLatest(
        this.formEntries.map(([k, control]) => {
            return control.value.pipe(
                map(value => {
                    return [k, value] as const
                })
            )
        })
    ).pipe(
        debounce(async () => {}),
        map(kvs => {
            return kvs.reduce((res, [k, v]) => {
                res[k as keyof Type] = v
                return res
            }, {} as Type)
        })
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

    dom: HTMLElement | null = null
    domRef = (ref: HTMLElement | null) => {
        this.dom = ref
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
