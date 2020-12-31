import { BehaviorSubject, combineLatest, EMPTY, Observable, of } from "rxjs"
import { debounce, debounceTime, map, switchMap, tap } from "rxjs/operators"
import { joinValidationInfo } from "./form-control-group"
import { AbstractControl, FormControlOptions, ValueOfAbstractControl } from "./types"

export class FormControlList<Meta, Children extends AbstractControl<unknown>, Type = ValueOfAbstractControl<Children>> implements AbstractControl<Type[]> {
    constructor(
        public defaultValue: Type[],
        public createChild: (x: Type) => Children,
        private options?: Omit<FormControlOptions<Type[], Meta>, "middleware">
    ) {}
    private nextChildId = 0
    private children$: BehaviorSubject<
        {
            key: number
            child: Children
        }[]
    > = new BehaviorSubject(
        this.defaultValue.map(value => {
            return {
                key: this.nextChildId++,
                child: this.createChild(value),
            }
        })
    )
    get children() {
        return this.children$.value
    }
    currentValue = this.defaultValue
    metadata = this.options?.metadata || EMPTY
    value = this.children$.pipe(
        switchMap(x => {
            return x.length === 0 ? of([]) : combineLatest(x.map(x => x.child.value as Observable<Type>)).pipe(debounce(async () => {}))
        })
    )
    error = combineLatest([
        this.children$.pipe(
            switchMap(x => {
                return !x.length ? of([]) : combineLatest(x.map(x => x.child.error))
            })
        ),
        !this.options?.validator ? of(null) : this.value.pipe(switchMap(this.options.validator)),
    ]).pipe(
        debounceTime(0),
        map(([childErr, selfErr]) => {
            return joinValidationInfo([...childErr, selfErr])
        })
    )
    change = (value: Type[]) => {
        this.children$.next(
            value.map((item, i) => {
                return {
                    key: this.nextChildId++,
                    child: this.createChild(item),
                }
            })
        )
    }
    push(value: Type) {
        this.children$.next(
            this.children$.value.concat({
                key: this.nextChildId++,
                child: this.createChild(value),
            })
        )
    }
    insert(value: Type, index: number) {
        const clone = this.children$.value.slice()
        clone.splice(index, 0, {
            key: this.nextChildId++,
            child: this.createChild(value),
        })
        this.children$.next(clone)
    }
    delete(index: number) {
        const clone = this.children$.value.slice()
        clone.splice(index, 1)
        this.children$.next(clone)
    }
    swap(indexA: number, indexB: number) {
        const clone = this.children$.value.slice()
        const tmp = clone[indexA]
        clone[indexA] = clone[indexB]
        clone[indexB] = tmp
        this.children$.next(clone)
    }
}
