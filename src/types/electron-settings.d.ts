declare namespace Electron
{
    /**
     * provides functions for manipulating settings
     */
    class Settings
    {
        /**
         * checks whether the settings object contains key at `keyPath`
         * @param {string} keyPath path to key
         * @returns {boolean} true if the key exists, otherwise false
         */
        public has(keyPath: string): boolean;

        /**
         * sets the `value` at the given `keyPath`
         * @param {string} keyPath path to key that will be set, it doesn't have to exist
         * @param {T} value the value to set at `keyPath`, this must be a data type supported by JSON
         * @param {ISetOptions} options options
         * @returns {Settings} this instance of settings
         */
        public set<T = any>(keyPath: string, value: T, options?: Settings.ISetOptions): Settings;

        /**
         * sets all settings to `obj`
         * @param {T} obj the new settings object
         * @param {ISetOptions} options options
         * @returns {Settings} this instance of settings
         */
        public setAll<T = any>(obj: T, options?: Settings.ISetOptions): Settings;

        /**
         * returns the value at the given `keyPath` or, if it doesn't exist, sets it to `defaultValue`, if provided
         * @param {string} keyPath path to key
         * @param {T} defaultValue the value to apply if the setting does not already exist
         * @returns {T} value at `keyPath` or default value
         */
        public get<T = any>(keyPath: string, defaultValue: T): T;

        /**
         * returns all settings
         * @returns {Object} all settings
         */
        public getAll(): Object;

        /**
         * deletes the key and value at `keyPath`
         * @param {string} keyPath path to key
         * @param {ISetOptions} options options
         * @returns {Settings} this instance of settings
         */
        public delete(keyPath: string, options?: Settings.ISetOptions): Settings;

        /**
         * deletes all settings
         * @param {ISetOptions} options options
         * @returns {Settings} this instance of settings
         */
        public deleteAll(options?: Settings.ISetOptions): Settings;

        /**
         * watches key at `keyPath` for changes
         * @param keyPath path to key
         * @param handler callback that will be called when the value at `keyPath` changes
         * @returns {Settings.Observer} observer instance that watches value at `keyPath`
         */
        public watch<T = any>(keyPath: string, handler: ((this: Settings.Observer, newValue: T, oldValue: T) => void)): Settings.Observer;

        /**
         * gets the absolute path to where the settings file is or will be stored
         * @see https://github.com/nathanbuchar/electron-settings/wiki/API-documentation#file
         */
        public file(): string;
    }

    /**
     * contains classes and interfaces for Settings
     */
    namespace Settings
    {
        /**
        * options for settings.set() and settings.setAll()
        */
        interface ISetOptions
        {
            /**
             * prettify the JSON output, defaults to false
             */
            prettify?: boolean;
        }

        /**
         * observes key value at specified path
         */
        class Observer
        {
            /**
             * disposes of this `Observer` instance
             */
            dispose(): void;
        }
    }
}

declare module "electron-settings"
{
    const settings: Electron.Settings;
    export = settings;
}