import React from 'react';
import { FormPanel } from '../components/Auth/FormPanel';
import { ShowcasePanel } from '../components/Auth/ShowcasePanel';

export const AuthPage: React.FC = () => {
    return (
        <div className="flex w-full h-screen overflow-hidden bg-[var(--bg-base)]">
            <FormPanel />
            <ShowcasePanel />
        </div>
    );
};

export default AuthPage;
