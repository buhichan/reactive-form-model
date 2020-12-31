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

    const address = new FormControlList([] as {province: string, city: string}[], value=>{
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
        phonenumbers,
        address
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
