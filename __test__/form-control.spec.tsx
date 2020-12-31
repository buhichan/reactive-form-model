import "jest"
import { of } from "rxjs"
import { FormControl } from "../src"

// need https://github.com/facebook/jest/issues/2157 to have neat jest.runAllPromise()
// until then we have this
function wait(ms: number = 1) {
    return new Promise(resolve => {
        window.setTimeout(resolve, ms)
    })
}

describe("FormControl", () => {
    // beforeAll(() => {
    //     jest.useFakeTimers()
    // })

    // afterAll(() => {
    //     jest.useRealTimers()
    // })

    it("should work", async () => {
        const errMsg = "must start with '14'"
        const metadata = {
            tooltip: "Must start by '14'",
        }

        const input = new FormControl("test", {
            validator: async v => {
                await wait()
                if (!/^14/.test(String(v))) {
                    return errMsg
                }
            },
            middleware: v => {
                if (v.endsWith("  ")) {
                    v = v.slice(0, -1)
                }
                return v
            },
            metadata: of(metadata),
        })

        const valueChanged = jest.fn().mockName("valueChanged")
        const errorNotice = jest.fn().mockName("errorNotice")
        const metadataListener = jest.fn().mockName("metadataListener")

        input.value.subscribe(valueChanged)
        input.error.subscribe(errorNotice)
        input.metadata.subscribe(metadataListener)

        await wait(10)

        expect(valueChanged).toBeCalledTimes(1)
        expect(valueChanged).toBeCalledWith("test")

        expect(errorNotice).toBeCalledTimes(1)
        expect(errorNotice).toBeCalledWith(errMsg)

        expect(metadataListener).toBeCalledTimes(1)
        expect(metadataListener).toBeCalledWith(metadata)

        input.change("142851")

        expect(valueChanged).toBeCalledTimes(2)
        expect(valueChanged).toBeCalledWith("142851")

        await wait(10)

        expect(errorNotice).toBeCalledTimes(2)
        expect(errorNotice).toBeCalledWith(undefined)

        expect(metadataListener).toBeCalledTimes(1)
        expect(metadataListener).toBeCalledWith(metadata)

        input.change("42851")

        expect(valueChanged).toBeCalledTimes(3)
        expect(valueChanged).toBeCalledWith("42851")

        await wait(10)

        expect(errorNotice).toBeCalledTimes(3)
        expect(errorNotice).toBeCalledWith(errMsg)

        expect(metadataListener).toBeCalledTimes(1)
        expect(metadataListener).toBeCalledWith(metadata)
    })
})
