import { EMPTY, merge, Observable } from "rxjs"
import { filter, isEmpty, map, switchMap, take, tap } from "rxjs/operators"
import { FormControl } from "./form-control"
import { FormControlGroup } from "./form-control-group"
import { FormControlList } from "./form-control-list"
import { AbstractControl, ValidationInfo } from "./types"

/**
 *
 * Validate the form, and emit the first error on leaf input it encounters.
 * 验证表单, 输出其遇到的第一个叶子节点的错误(即会跳过有子字段错误的有错误字段,而使用其子字段错误)
 */
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
        childError = merge(...children.map(x => validateFormControl(x))).pipe(take(1))
    } else if (form instanceof FormControlList) {
        childError = merge(...form.children.value.map(x => validateFormControl(x.child))).pipe(take(1))
    } else if (form instanceof FormControl) {
        //do nothing
    } else {
        selfError = EMPTY
    }
    const isChildEmpty = childError.pipe(isEmpty())
    const res = isChildEmpty.pipe(
        switchMap(x => {
            return x ? selfError : childError
        })
    )

    return res
}

export function submitForm<Values>(
    form: FormControlGroup<any, unknown, Values>,
    handleSubmit: (values: Values) => Promise<unknown>,
    options?: {
        onError: (error: ValidationInfo) => void
    }
) {
    const validationResult = validateFormControl(form)

    return validationResult
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
