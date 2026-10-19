'use client';
import {type ReactNode} from 'react';
import {UserContentContext} from './ui-translation';
export default function UserText({children}:{children:ReactNode}){return <UserContentContext.Provider value>{children}</UserContentContext.Provider>;}
