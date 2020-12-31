[![travis ci](https://travis-ci.com/buhichan/reactive-form-model.svg?branch=master)](https://travis-ci.com/buhichan/reactive-form-model)
[![codecov](https://codecov.io/gh/buhichan/reactive-form-model/branch/master/graph/badge.svg)](https://codecov.io/gh/buhichan/reactive-form-model)

# What

This is a framework agnostic form model built on top of rxjs.

Features:

- [x] validator
- [x] middelware
- [x] dependency and reaction between fields
- [x] metadata 
    - this is where u put data needed by the view layer, such as select input's option list, and form labels
    - it's generic, u can put anything the view layer needs

Will not be features: 

- `type` or `widget` field which indicates what input type this field is
    - as a state management lib, this lib does not care about such information, you should put this into metadata field, e.g. 

        ```ts
        import {FormControl} from "reactive-form-model"
        import {of} from "rxjs"
        const password = new FormControl("", { 
            metadata: of({ 
                type: "password" 
            }) 
        })
        ```

- Framework support/Component implementation
    - it's real easy to implement, please see the [Example](#Example) to see how to do this.
- Json-like schema form
    - it's real easy to do

# Why

- zero dependency except rxjs.
- framework agnostic, can be used with react, vue
    - not angular because ng already have good reactive form model.
- separate form view and business logic

# Example

[This codesandbox](https://codesandbox.io/s/relaxed-fire-s0r08?file=/src/App.tsx:0-8222) shows how to use this lib with [ant-design](https://github.com/ant-design/ant-design)'s form, form item and input components

basically, u define a model like this (example is in react): 

```tsx
import {of, fromFetch} from "rxjs"
import {publishReplay, refCount} from "rxjs/operators"
import {FormControl, FormControlList, FormControlGroup} from "reactive-form-model"

async function validatePhoneNumber(v){
    return typeof v === 'number' || v.match(/^[0-9_+- ]+$/)
}

export function registrationFormModel(){
    const username = new FormControl("")
    const password = new FormControl("", { 
        metadata: of({ 
            type: "password" 
        }) 
    })
    const passwordConfirm = new FormControl("", { 
        metadata: of({ 
            type: "password" 
        }) 
    })

    const phoneNumbers = new FormControlList([], value=>{
        return new FormControl(value, {
            validator: validatePhoneNumber
        })
    })

    const provinceList = fromFetch("/province").pipe(
        publishReplay(1),
        refCount()
    )

    const addresses = new FormControlList([] as {province: string, city: string}[], value=>{
        const province = new FormControl(value.province, {
            //provice a list for use when rendered, but we don't care what component is used in view layer.
            metadata: provinceList
        })
        const city = new FormControl(value.city, {
            //provice citylist
            metadata: combineLatest([
                province.value,
                provinceList
            ]).pipe(
                map(([selectedProvince, provinceList])=>{
                    const cityList = (selectedProvince && provinceList.find(x=>x.id === selectedProvince))?.cityList
                    return {
                        selectedProvince
                        cityList
                    }
                })
            )
        })
        //clear city after province changed
        province.value.subscribe(()=>{
            city.change("")
        })
        return new FormControlGroup({
            province,
            city,
        })
    })

    return new FormControlGroup({
        username,
        password,
        passwordConfirm,
        phoneNumbers,
        addresses
    }, {
        validator: async v=>{
            if(!v.username){
                return "must fill username"
            }
            if(v.password !== v.passwordConfirm){
                return "password must be equal to passwordConfirm"
            }
        }
    })
}

```

Then you create a connection component between the model and how to render then, this needs only done once and u can use in all forms.

If you are using ant-design, u can directly copy these.

```tsx
import { Form, Col, Row, Button } from "antd"
import { FormItemProps } from "antd/lib/form"
import * as React from "react"
import { AbstractControl, ValidationInfo, FormControlList } from "reactive-form-model"
import { CloseOutlined, PlusOutlined, MinusOutlined } from "@ant-design/icons"
import { useSubscription } from "use-subscription"

type FormItemRenderChildren<T, Meta> = (inputProps: { value?: T; onChange?: (v: T) => void }, behavior: Meta | null, err: ValidationInfo) => React.ReactNode

export function FormItem<T, Meta>({
    field,
    children,
    ...rest
}: Omit<FormItemProps, "name" | "children"> & {
    field: AbstractControl<T, Meta>
    children: FormItemRenderChildren<T, Meta>
}) {
    const value = useObservable(field.value)
    const metadata = useObservable(field.metadata)
    const error = useObservable(field.error)

    return (
        <Form.Item labelCol={{span:4}} wrapperCol={{span:20}} hasFeedback help={!!error ? String(error) : undefined} validateStatus={!!error ? "error" : undefined} {...rest}>
            {children(
                {
                    value: value === null ? undefined : value,
                    onChange: field.change,
                },
                meta,
                error
            )}
        </Form.Item>
    )
}


//eslint-disable-next-line
export function FormList<Meta, Children extends AbstractControl<any, any>>({
    field,
    children,
    ...rest
}: Omit<FormItemProps, "name" | "children"> & {
    field: FormControlList<Meta, Children>
    children: (child: Children, arrayMeta: Meta | null, index: number) => React.ReactNode
}) {
    const items = useObservable(field.children)
    const metadata = useObservable(field.metadata)
    const error = useObservable(field.error)
    return (
        <Form.Item  labelCol={{span:4}} wrapperCol={{span:20}} hasFeedback help={!!error ? String(error) : undefined} validateStatus={!!error ? "error" : undefined} {...rest}>
            <Row>
                <Col span={24}>
                    {items.map((x, i) => {
                        return (
                            <Row gutter={8} key={x.key}>
                                <Col>
                                    <Button
                                        icon={<MinusOutlined />}
                                        onClick={() => {
                                            field.delete(i)
                                        }}
                                    ></Button>
                                </Col>
                                <Col span={22}>
                                    {children(x.child, metadata, i)}
                                </Col>
                            </Row>
                        )
                    })}
                </Col>
            </Row>
            <Row>
                <Col span={24}>
                    <Button
                        icon={<PlusOutlined />}
                        onClick={() => {
                            //eslint-disable-next-line
                            field.push({} as any)
                        }}
                    ></Button>
                </Col>
            </Row>
        </Form.Item>
    )
}

function useObservable<T>(ob: Observable<T>){
    return useSubscription(useMemo(()=>{
        let value = null
        return {
            getCurrentValue: ()=>value,
            subscribe: cb=>{
                const sub = ob.subscribe((v)=>{
                    value = v
                    cb()
                })
                return ()=>sub.unsubscribe()
            }
        }
    }, [ob]))
}
```

Last u render it, this needs to be done for every single form.

```tsx

function App(){
    const form = useMemo(registrationFormModel,[])

    const hasError = useObservable(form.error)

    return <Form>
        <FormItem label={"UserName"} field={form.children.username}>
            {(props)=>{
                return <Input {...props} maxLength={24}>
            }}
        </FormItem>
        <FormItem label={"Password"} field={form.children.password}>
            {(props)=>{
                return <Input {...props} maxLength={24} type="password">
            }}
        </FormItem>
        <FormItem label={"Confirm Password"} field={form.children.passwordConfirm}>
            {(props)=>{
                return <Input {...props} maxLength={24} type="password">
            }}
        </FormItem>
        <FormList label="PhoneNumber" field={form.children.phoneNumbers}>
            {field=>{
                return <FormItem field={field}>
                    {(props)=>{
                        return <Input {...props} maxLength={24}>
                    }}
                </FormItem>
            }}
        </FormList>
        <FormList label="Addresses" field={form.children.addresses}>
            {field=>{
                return <>
                    <FormItem field={field.children.province}>
                        {(props, options)=>{
                            return <Select {...props} options={options}>
                        }}
                    </FormItem>
                    <FormItem field={field.children.city}>
                        {(props, options)=>{
                            return <Select {...props} options={options.cityList}>
                        }}
                    </FormItem>
                </>
            }}
        </FormList>
        <Button htmlType="submit" disabled={!!hasErro}>Submit</Button>
    </Form>
}

```