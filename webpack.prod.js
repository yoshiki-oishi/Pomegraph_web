const path = require('path');
const { library } = require('webpack');
const ASSET_PATH = process.env.ASSET_PATH || '/';
const webpack = require('webpack')

module.exports = {
    // エントリーポイントの設定
    entry: './js/iGraph/iGraph.js',
    target: 'node',
    // ビルド後、'./dist/my-bundle-mins.js'というbundleファイルを生成する
    mode: 'production',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'my-bundle-min.js',
        publicPath: ASSET_PATH,
        library: 'Pomegraph'
    },
    devServer: {
        static: [
            {
                directory: path.join(__dirname, 'docs'),
            },
            {
                directory: path.join(__dirname, 'css'),
                publicPath: "/dist/css"
            },
            {
                directory: path.join(__dirname, 'dist'),
                publicPath: "/dist"
            },
            {
                directory: path.join(__dirname, 'data'),
                publicPath: "/data"
            },
            {
                directory: path.join(__dirname, 'img'),
                publicPath: "/dist/img"
            },
            {
                directory: path.join(__dirname, '/'),
                publicPath: "/"
            },
        ],
        compress: true,
        port: 8082,
        hot: true
    },
    resolve:{
        extensions: ['','.js'],
        alias: {
            'utils' : path.resolve(__dirname, './js/iGraph/FileReader.js')
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
        new webpack.ProvidePlugin({
            'myFileReader': 'utils'
        })
    ],
};