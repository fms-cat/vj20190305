/* eslint-env node */

const path = require( 'path' );

const ForkTsCheckerWebpackPlugin = require( 'fork-ts-checker-webpack-plugin' );
const HtmlWebpackPlugin = require( 'html-webpack-plugin' );
const webpack = require( 'webpack' );

module.exports = ( env, argv ) => {
  const DEBUG = argv.mode === 'development';

  return {
    entry: path.resolve( __dirname, 'src/main.ts' ),
    output: {
      path: path.resolve( __dirname, 'dist' ),
      filename: 'bundle.js'
    },
    module: {
      rules: [
        { test: /\.(png|jpg|gif|ttf|otf)$/, use: 'url-loader' },
        { test: /\.(sass|scss|css)$/, use: [ 'style-loader', 'css-loader' ] },
        { test: /\.(sass|scss)$/, use: 'sass-loader' },
        { test: /\.(glsl|frag|vert)$/, use: [ 'raw-loader', 'scarlett-glslify-loader' ] },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: { happyPackMode: true, transpileOnly: true }
            }
          ]
        },
        { test: /\.js$/, use: 'babel-loader' },
      ]
    },
    resolve: {
      modules: [ 'node_modules' ],
      extensions: [ '.ts', '.js' ],
    },
    optimization: {
      minimize: !DEBUG
    },
    devServer: {
      inline: true,
      hot: true
    },
    plugins: [
      new webpack.DefinePlugin( {
        'process.env': { DEBUG: DEBUG },
      } ),
      new HtmlWebpackPlugin( {
        template: './src/html/index.html'
      } ),
      ...( DEBUG ? [
        new webpack.NamedModulesPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new ForkTsCheckerWebpackPlugin( { checkSyntacticErrors: true } ),
      ] : [] ),
    ],
    devtool: DEBUG ? 'inline-source-map' : false
  };
};