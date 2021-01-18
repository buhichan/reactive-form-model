import { EMPTY, Observable, race } from "rxjs"
import { filter, isEmpty, map, switchMap, take, tap } from "rxjs/operators"
import { FormControl } from "./form-control"
import { FormControlGroup } from "./form-control-group"
import { FormControlList } from "./form-control-list"
import { AbstractControl, ValidationInfo } from "./types"

export function validateFormControl(
    form: FormControlGroup<any, unknown, any> | FormControlList<unknown, any, unknown> | FormControl<unknown>
): Observable<{
    error: ValidationInfo
    dom: HTMLElement | null
}> {
    let selfError = form.error.pipe(
        map(x => {
            return {
                error: x,
                dom: form.dom,
            }
        }),
        take(1),
        filter(x => !!x.error)
    )
    let childError: Observable<{
        error: ValidationInfo
        dom: HTMLElement | null
    }> = EMPTY
    if (form instanceof FormControlGroup) {
        const children = (Object.values(form.children) as AbstractControl[]).filter(x => {
            return x instanceof FormControlGroup || x instanceof FormControlList || x instanceof FormControl
        }) as (FormControlGroup<any, unknown, unknown> | FormControlList<unknown, any, unknown> | FormControl<unknown>)[]
        childError = race(...children.map(x => validateFormControl(x)))
    } else if (form instanceof FormControlList) {
        childError = form.children.pipe(
            switchMap(x => {
                return race(...x.map(x => validateFormControl(x.child)))
            })
        )
    } else if (form instanceof FormControl) {
        //do nothing
    } else {
        selfError = EMPTY
    }
    const isChildEmpty = childError.pipe(isEmpty())
    return isChildEmpty.pipe(
        switchMap(x => {
            return x ? selfError : childError
        })
    )
}

export function submitForm<Values>(
    form: FormControlGroup<any, unknown, Values>,
    handleSubmit: (values: Values) => Promise<unknown>,
    options?: {
        onError: (error: ValidationInfo) => void
    }
) {
    return validateFormControl(form)
        .pipe(
            tap(v => {
                if (v.dom) {
                    v.dom.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "center",
                    })
                    const input = v.dom.querySelector("input")
                    input && input.focus()
                }
                if (v.error) {
                    options?.onError(String(v.error))
                }
            }),
            isEmpty(),
            switchMap(v => {
                if (v) {
                    return form.value.pipe(
                        switchMap(v => {
                            return handleSubmit(v)
                        })
                    )
                } else {
                    return EMPTY
                }
            })
        )
        .toPromise()
}
