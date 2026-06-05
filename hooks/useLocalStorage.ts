import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

const resolveInitialValue = <T,>(initialValue: T | (() => T)): T =>
    typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue;

export const useLocalStorage = <T,>(
    key: string,
    initialValue: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] => {
    const [value, setValueState] = useState<T>(() => {
        const fallback = resolveInitialValue(initialValue);

        if (typeof window === 'undefined') {
            return fallback;
        }

        try {
            const rawValue = window.localStorage.getItem(key);
            return rawValue === null ? fallback : (JSON.parse(rawValue) as T);
        } catch {
            return fallback;
        }
    });

    const setValue = useCallback<Dispatch<SetStateAction<T>>>(
        (nextValue) => {
            setValueState((prevValue) => {
                const resolvedValue =
                    typeof nextValue === 'function'
                        ? (nextValue as (prevState: T) => T)(prevValue)
                        : nextValue;

                if (typeof window !== 'undefined') {
                    try {
                        window.localStorage.setItem(key, JSON.stringify(resolvedValue));
                    } catch {
                        // Ignore storage write failures and keep in-memory state in sync.
                    }
                }

                return resolvedValue;
            });
        },
        [key]
    );

    return [value, setValue];
};

export default useLocalStorage;
