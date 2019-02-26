import { GL, GLCat, GLCatTexture } from '@fms-cat/glcat-ts';
import Xorshift from './xorshift';

export class RandomTexture {
  private __texture: GLCatTexture;
  private __array: Uint8Array;
  private __rng: Xorshift;
  private __width: number;
  private __height: number;

  constructor( glCat: GLCat, width: number, height: number = width ) {
    this.__width = width;
    this.__height = height;
    this.__rng = new Xorshift();
    this.__array = new Uint8Array( width * height * 4 );
    this.__texture = glCat.createTexture()!;
    this.__texture.textureWrap( GL.REPEAT );
  }

  public getTexture(): GLCatTexture {
    return this.__texture;
  }

  public dispose() {
    this.__texture.dispose();
  }

  public update( seed?: number ) {
    if ( seed ) { this.__rng.seed = seed; }

    for ( let i = 0; i < this.__array.length; i ++ ) {
      this.__array[ i ] = Math.floor( this.__rng.gen() * 256.0 );
    }

    this.__texture.setTextureFromArray(
      this.__width,
      this.__height,
      this.__array
    );
  }
}

export default RandomTexture;
