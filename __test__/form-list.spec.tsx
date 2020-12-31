import "jest"
import { of } from "rxjs"
import { map } from "rxjs/operators"
import { FormControl, FormControlGroup, FormControlList } from "../src"

// need https://github.com/facebook/jest/issues/2157 to have neat jest.runAllPromise()
// until then we have this
function wait(ms: number = 1) {
    return new Promise(resolve => {
        window.setTimeout(resolve, ms)
    })
}

describe("FormControlList", () => {
    // beforeAll(() => {
    //     jest.useFakeTimers()
    // })

    // afterAll(() => {
    //     jest.useRealTimers()
    // })

    it("should work", async () => {
        const errMsg = "must start with '14'"
        const arrayInputMetadata = "114514"
        const possibleTypes = ["select", "input"]
        const typeErrorMessage = "value must be one of " + possibleTypes.join(",")

        const isSelectField = {
            isSelect: true,
        }
        const isNotSelectField = {
            isSelect: false,
        }

        const defaultValue = [] as {
            type: "select" | "input"
            value: string | string[]
        }[]

        const fieldModel = new FormControlList(
            defaultValue,
            value => {
                const typeField = new FormControl(value.type, {
                    validator: async v => {
                        await wait()
                        if (!possibleTypes.includes(v)) {
                            return typeErrorMessage
                        }
                    },
                    metadata: of({
                        options: possibleTypes,
                    }),
                })

                const metadata = typeField.value.pipe(
                    map(x => {
                        return x === "select" ? isSelectField : isNotSelectField
                    })
                )

                const valueField = new FormControl(value.value, {
                    metadata,
                })

                return new FormControlGroup({
                    type: typeField,
                    value: valueField,
                })
            },
            {
                validator: async v => {
                    if (v.length < 2) {
                        return "length must be >= 2"
                    }
                },
                metadata: of(arrayInputMetadata),
            }
        )

        let currentValue = defaultValue
        const valueChanged = jest
            .fn(v => {
                currentValue = v
            })
            .mockName("valueChanged")
        const errorNotice = jest.fn().mockName("errorNotice")
        const metadataListener = jest.fn().mockName("metadataListener")

        fieldModel.value.subscribe(valueChanged)
        fieldModel.error.subscribe(errorNotice)
        fieldModel.metadata.subscribe(metadataListener)

        await wait(10)

        expect(valueChanged).toBeCalledTimes(1)
        expect(valueChanged).toBeCalledWith(defaultValue)

        expect(errorNotice).toBeCalledTimes(1)
        expect(errorNotice).toBeCalledWith(["length must be >= 2"])

        expect(metadataListener).toBeCalledTimes(1)
        expect(metadataListener).toBeCalledWith(arrayInputMetadata)

        fieldModel.push({
            type: "select",
            value: [],
        })
        fieldModel.push({
            type: "input",
            value: "114514",
        })

        await wait(10)

        expect(valueChanged).toBeCalledTimes(2)
        expect(currentValue.length).toBe(2)
        expect(currentValue[0].type).toBe("select")
        expect(currentValue[1].value).toBe("114514")

        expect(errorNotice).toBeCalledWith(undefined)

        expect(metadataListener).toBeCalledTimes(1)
        expect(metadataListener).toBeCalledWith(arrayInputMetadata)

        expect(fieldModel.children.length).toBe(2)

        const childMetadataListener1 = jest.fn()
        fieldModel.children[0].child.children.value.metadata.subscribe(childMetadataListener1)
        const childMetadataListener2 = jest.fn()
        fieldModel.children[1].child.children.value.metadata.subscribe(childMetadataListener2)

        await wait(10)

        expect(childMetadataListener1).toBeCalledWith(isSelectField)
        expect(childMetadataListener2).toBeCalledWith(isNotSelectField)

        fieldModel.children[0].child.children.type.change("input")

        await wait(10)

        expect(childMetadataListener1).toBeCalledWith(isNotSelectField)
    })

    it("should not fire listener too often", async () => {
        const defaultValue = [1]
        const fieldModel = new FormControlList(
            defaultValue,
            value => {
                return new FormControl(value)
            },
            {
                validator: async v => {
                    if (v.length < 100) {
                        return "length must be >= 100"
                    }
                },
            }
        )

        const valueListener = jest.fn()
        const errorListener = jest.fn()
        fieldModel.value.subscribe(valueListener)
        fieldModel.error.subscribe(errorListener)

        await wait(10)

        fieldModel.change(new Array(99).fill(0))

        await wait(10)

        expect(valueListener).toBeCalledTimes(2)
        expect(errorListener).toBeCalledTimes(2)

        await wait(10)

        for (let i = 0; i < 100; i++) {
            fieldModel.insert(i, i)
        }

        await wait(10)

        expect(valueListener).toBeCalledTimes(3)
        expect(errorListener).toBeCalledTimes(3)
        expect(errorListener).toBeCalledWith(undefined)
    })
})
