import "jest"
import { of } from "rxjs"
import { FormControl, FormControlGroup } from "../src"

// need https://github.com/facebook/jest/issues/2157 to have neat jest.runAllPromise()
// until then we have this
function wait(ms: number = 1) {
    return new Promise(resolve => {
        window.setTimeout(resolve, ms)
    })
}

describe("FormControlGroup", () => {
    it("should work", async () => {
        const errMsg = "用户名必填"
        const metadata = {
            tooltip: "Must start by '14'",
        }
        const defaultValue = {
            username: "",
            password: "",
            passwordConfirm: "",
            verifyCode: 0,
            rememberMe: false,
        }
        const input = new FormControlGroup(
            {
                username: new FormControl(defaultValue.username),
                password: new FormControl(defaultValue.password),
                passwordConfirm: new FormControl(defaultValue.passwordConfirm),
                verifyCode: new FormControl(defaultValue.verifyCode),
                rememberMe: new FormControl(defaultValue.rememberMe),
            },
            {
                validator: async v => {
                    if (v.password !== v.passwordConfirm) {
                        return "password confirmed must be identical to password"
                    }
                    if (!v.username) {
                        return errMsg
                    }
                },
                metadata: of(metadata),
            }
        )

        let currentValue: typeof defaultValue & { [name: string]: unknown } = defaultValue

        const valueChanged = jest
            .fn(v => {
                currentValue = v
            })
            .mockName("valueChanged")
        const errorNotice = jest.fn().mockName("errorNotice")
        const metadataListener = jest.fn().mockName("metadataListener")
        input.value.subscribe(valueChanged)
        input.error.subscribe(errorNotice)
        input.metadata.subscribe(metadataListener)

        await wait(10)

        expect(valueChanged).toBeCalledTimes(1)
        expect(valueChanged).toBeCalledWith(defaultValue)

        expect(errorNotice).toBeCalledTimes(1)
        expect(errorNotice).toBeCalledWith([errMsg])

        expect(metadataListener).toBeCalledTimes(1)
        expect(metadataListener).toBeCalledWith(metadata)

        const changedValue = {
            username: "11451  ",
            password: "1919810",
            passwordConfirm: "1919810",
            rememberMe: true,
            verifyCode: 1,
            wagawaga: 1,
        }
        input.change(changedValue)

        await wait(10)

        expect(valueChanged).toBeCalledTimes(2)
        expect(changedValue).toMatchObject(currentValue)
        expect(currentValue.wagawaga).toBeUndefined()

        expect(errorNotice).toBeCalledTimes(2)
        expect(errorNotice).toBeCalledWith(undefined)
    })

    it("support dom ref", () => {
        const fieldModel = new FormControlGroup({})

        expect(fieldModel.dom).toBe(null)
        const el = document.createElement("div")
        fieldModel.domRef(el)
        expect(fieldModel.dom).toBe(el)
        fieldModel.domRef(null)
        expect(fieldModel.dom).toBe(null)
    })
})
