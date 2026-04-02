declare module "weather-js" {
    interface WeatherOptions {
        search: string;
        degreeType: string;
        lang?: string;
    }
    function find(options: WeatherOptions, callback: (err: Error | null, result: any[]) => void): void;
    export { find };
}
